'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: any;
};

/**
 * Mencatat transaksi baru (Pos Tabungan Personal atau Bersama) dengan dukungan kategori dinamis & upload bukti transfer
 */
export async function createTransaction(formData: FormData): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const destination = (formData.get('destination') as string)?.trim(); // potId or 'personal'
  const type = formData.get('type') as 'in' | 'out'; // 'in' (pemasukan/setoran) or 'out' (pengeluaran)
  const amountRaw = formData.get('amount') as string;
  const description = (formData.get('description') as string)?.trim() || null;
  const categoryName = (formData.get('category') as string)?.trim() || null;
  const transactionDate =
    (formData.get('transaction_date') as string)?.trim() ||
    new Date().toISOString().split('T')[0];
  const receiptFile = formData.get('receipt') as File | null;

  // 1. Validasi nominal
  const cleanAmountStr = (amountRaw || '').replace(/[^0-9]/g, '');
  const amount = Number(cleanAmountStr);

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Nominal transaksi harus lebih besar dari 0.' };
  }

  if (!destination) {
    return { error: 'Silakan pilih pos tabungan tujuan.' };
  }

  const adminClient = createAdminClient();

  // 2. Resolve Target Pot (bisa via pot_id langsung atau fallback 'personal')
  let targetPot: any = null;

  if (destination === 'personal') {
    // Cari pos personal user yang aktif
    const { data: memberRows } = await adminClient
      .from('pot_members')
      .select('pot_id, savings_pots(*)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE');

    const personalMember = (memberRows ?? []).find(
      (m: any) => m.savings_pots?.type === 'PERSONAL' && m.savings_pots?.status === 'ACTIVE'
    );

    if (personalMember && personalMember.savings_pots) {
      targetPot = personalMember.savings_pots;
    } else {
      // Buat pos personal default jika belum ada
      const { data: newPot, error: createPotErr } = await adminClient
        .from('savings_pots')
        .insert({
          type: 'PERSONAL',
          name: 'Tabungan Utama',
          description: 'Pos tabungan personal utama',
          opening_balance: 0,
          created_by: user.id,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (createPotErr || !newPot) {
        return { error: 'Gagal menginisialisasi pos personal: ' + (createPotErr?.message || '') };
      }
      targetPot = newPot;
    }
  } else {
    // Cari pot berdasarkan ID dan verifikasi keanggotaan aktif
    const { data: memberRow } = await adminClient
      .from('pot_members')
      .select('role, savings_pots(*)')
      .eq('pot_id', destination)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!memberRow || !memberRow.savings_pots) {
      return { error: 'Anda bukan anggota aktif pada pos tabungan yang dipilih.' };
    }
    targetPot = memberRow.savings_pots;
  }

  if (!targetPot) {
    return { error: 'Pos tabungan tidak ditemukan.' };
  }

  // 3. Resolve Kategori Dinamis
  let categoryId: string | null = null;
  if (categoryName && categoryName !== 'Lainnya') {
    const { data: cat } = await adminClient
      .from('categories')
      .select('id')
      .ilike('name', categoryName)
      .limit(1)
      .maybeSingle();

    if (cat) {
      categoryId = cat.id;
    } else {
      const { data: newCat } = await adminClient
        .from('categories')
        .insert({
          owner_user_id: user.id,
          name: categoryName,
          scope_type: targetPot.type === 'PERSONAL' ? 'PERSONAL' : 'SHARED',
          transaction_type:
            type === 'in'
              ? targetPot.type === 'PERSONAL'
                ? 'INCOME'
                : 'CONTRIBUTION'
              : 'EXPENSE',
        })
        .select('id')
        .single();
      if (newCat) categoryId = newCat.id;
    }
  }

  // 4. Tentukan Jenis & Status Transaksi sesuai PRD v2.1
  let transactionType: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION';
  let initialStatus: 'ACTIVE' | 'PENDING_APPROVAL' = 'ACTIVE';
  let requiresApproval = false;

  if (targetPot.type === 'PERSONAL') {
    transactionType = type === 'in' ? 'INCOME' : 'EXPENSE';
    initialStatus = 'ACTIVE';
  } else {
    // SHARED pot
    transactionType = type === 'in' ? 'CONTRIBUTION' : 'EXPENSE';

    if (transactionType === 'EXPENSE') {
      // Validasi pencegahan saldo negatif (BR-03)
      const [{ data: potRow }, { data: potTxs }] = await Promise.all([
        adminClient.from('savings_pots').select('opening_balance').eq('id', targetPot.id).single(),
        adminClient
          .from('transactions')
          .select('amount, transaction_type')
          .eq('pot_id', targetPot.id)
          .eq('status', 'ACTIVE'),
      ]);

      const openingBalance = Number(potRow?.opening_balance ?? 0);
      const currentBalance = (potTxs ?? []).reduce((acc, t) => {
        const amt = Number(t.amount);
        return acc + (t.transaction_type === 'EXPENSE' ? -amt : amt);
      }, openingBalance);

      if (currentBalance - amount < 0) {
        const formatRp = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(currentBalance);
        return {
          error: `Saldo pos tidak mencukupi untuk penarikan ini. (Saldo saat ini: ${formatRp})`,
        };
      }

      // Hitung jumlah anggota aktif (FR-20)
      const { count: memberCount } = await adminClient
        .from('pot_members')
        .select('id', { count: 'exact', head: true })
        .eq('pot_id', targetPot.id)
        .eq('status', 'ACTIVE');

      // Jika lebih dari 1 anggota aktif, butuh persetujuan multi-sig
      if (memberCount && memberCount > 1) {
        initialStatus = 'PENDING_APPROVAL';
        requiresApproval = true;
      } else {
        initialStatus = 'ACTIVE';
      }
    }
  }

  // 5. Simpan transaksi ke tabel terpadu transactions
  const { data: tx, error: txErr } = await adminClient
    .from('transactions')
    .insert({
      pot_id: targetPot.id,
      transaction_type: transactionType,
      amount,
      category_id: categoryId,
      category_name: categoryName,
      transaction_date: transactionDate,
      description,
      status: initialStatus,
      created_by_user_id: user.id,
      contributor_user_id: transactionType === 'CONTRIBUTION' ? user.id : null,
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    return { error: 'Gagal mencatat transaksi: ' + (txErr?.message || 'Error') };
  }

  // 6. Upload Bukti Struk jika ada
  let receiptUrl: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    receiptUrl = await handleReceiptUpload(adminClient, tx.id, receiptFile);
    if (receiptUrl) {
      await adminClient.from('transactions').update({ receipt_url: receiptUrl }).eq('id', tx.id);
    }
  }

  // 7. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    pot_id: targetPot.id,
    actor_user_id: user.id,
    entity_type: 'TRANSACTION',
    entity_id: tx.id,
    action: requiresApproval ? 'SUBMIT_FOR_APPROVAL' : 'CREATE',
    after_data: {
      pot_type: targetPot.type,
      transaction_type: transactionType,
      amount,
      description,
      receipt_url: receiptUrl,
      requires_approval: requiresApproval,
      status: initialStatus,
    },
    reason: `Mencatat transaksi ${transactionType} sebesar ${amount}`,
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');
  return {
    success: true,
    data: { id: tx.id, receipt_url: receiptUrl, requiresApproval },
  };
}

/** Helper untuk mengunggah file bukti struk ke Supabase Storage */
async function handleReceiptUpload(
  adminClient: any,
  transactionId: string,
  file: File
): Promise<string | null> {
  try {
    if (file.size > 5 * 1024 * 1024) return null; // Max 5 MB

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${transactionId}-${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error } = await adminClient.storage
      .from('receipts')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading receipt:', error.message);
      return null;
    }

    const { data: publicData } = adminClient.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (err) {
    console.error('Receipt upload failed:', err);
    return null;
  }
}

/**
 * Membatalkan transaksi (VOID) dengan alasan yang tercatat di audit log
 */
export async function voidTransaction(
  transactionId: string,
  reason: string
): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir.' };
  }

  if (!reason || reason.trim().length < 3) {
    return { error: 'Alasan pembatalan (void) wajib diisi minimal 3 karakter.' };
  }

  const adminClient = createAdminClient();

  // 1. Ambil transaksi
  const { data: tx, error: fetchErr } = await adminClient
    .from('transactions')
    .select('id, pot_id, created_by_user_id, status, amount, transaction_type, savings_pots(type)')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (tx.status === 'VOIDED') {
    return { error: 'Transaksi ini sudah pernah dibatalkan sebelumnya.' };
  }

  // 2. Cek otorisasi berdasarkan keanggotaan pos
  const { data: member } = await adminClient
    .from('pot_members')
    .select('role')
    .eq('pot_id', tx.pot_id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!member) {
    return { error: 'Anda tidak memiliki hak akses pada pos tabungan ini.' };
  }

  const isCreator = tx.created_by_user_id === user.id;
  const isOwner = member.role === 'OWNER';

  if (!isCreator && !isOwner) {
    return {
      error: 'Hanya pembuat transaksi atau pemilik (owner) pos yang dapat membatalkan transaksi ini.',
    };
  }

  // 3. Update status menjadi VOIDED
  const { error: updateErr } = await adminClient
    .from('transactions')
    .update({
      status: 'VOIDED',
      void_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (updateErr) {
    return { error: 'Gagal membatalkan transaksi: ' + updateErr.message };
  }

  // 4. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    pot_id: tx.pot_id,
    actor_user_id: user.id,
    entity_type: 'TRANSACTION',
    entity_id: transactionId,
    action: 'VOID',
    before_data: { status: tx.status, amount: tx.amount, type: tx.transaction_type },
    after_data: { status: 'VOIDED', void_reason: reason.trim() },
    reason: reason.trim(),
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');
  return { success: true };
}

/**
 * Memperbarui data transaksi personal (Nominal, Kategori, Keterangan, Tanggal, Jenis)
 * dengan pencatatan jejak audit (UPDATE)
 */
export async function updatePersonalTransactionAction(
  transactionId: string,
  payload: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    categoryName: string;
    description: string;
    transactionDate: string;
    paymentMethod?: string;
  }
): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  if (!payload.amount || isNaN(payload.amount) || payload.amount <= 0) {
    return { error: 'Nominal transaksi harus lebih besar dari 0.' };
  }

  const adminClient = createAdminClient();

  // 1. Ambil transaksi existing
  const { data: tx, error: fetchErr } = await adminClient
    .from('transactions')
    .select('*, savings_pots(type)')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (tx.created_by_user_id !== user.id) {
    return { error: 'Anda hanya dapat mengubah transaksi milik Anda sendiri.' };
  }

  if (tx.status === 'VOIDED') {
    return { error: 'Transaksi yang sudah dibatalkan (VOIDED) tidak dapat diubah.' };
  }

  // 2. Resolve kategori
  let categoryId: string | null = tx.category_id;
  const cleanCat = payload.categoryName?.trim();
  if (cleanCat && cleanCat !== 'Lainnya') {
    const { data: cat } = await adminClient
      .from('categories')
      .select('id')
      .ilike('name', cleanCat)
      .limit(1)
      .maybeSingle();

    if (cat) {
      categoryId = cat.id;
    } else {
      const { data: newCat } = await adminClient
        .from('categories')
        .insert({
          owner_user_id: user.id,
          name: cleanCat,
          scope_type: 'PERSONAL',
          transaction_type: payload.type,
        })
        .select('id')
        .single();
      if (newCat) categoryId = newCat.id;
    }
  }

  // 3. Update transaksi
  const { error: updateErr } = await adminClient
    .from('transactions')
    .update({
      transaction_type: payload.type,
      amount: payload.amount,
      category_id: categoryId,
      category_name: cleanCat || null,
      description: payload.description?.trim() || null,
      transaction_date: payload.transactionDate || tx.transaction_date,
      payment_method: payload.paymentMethod || tx.payment_method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (updateErr) {
    return { error: 'Gagal memperbarui transaksi: ' + updateErr.message };
  }

  // 4. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    pot_id: tx.pot_id,
    actor_user_id: user.id,
    entity_type: 'TRANSACTION',
    entity_id: transactionId,
    action: 'UPDATE',
    before_data: {
      amount: tx.amount,
      type: tx.transaction_type,
      description: tx.description,
      date: tx.transaction_date,
    },
    after_data: {
      amount: payload.amount,
      type: payload.type,
      description: payload.description?.trim(),
      date: payload.transactionDate,
    },
    reason: 'Perubahan rincian transaksi oleh pemilik akun',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');
  return { success: true };
}
