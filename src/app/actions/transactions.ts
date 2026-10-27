'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { BASELINE_CATEGORIES } from '@/utils/finance';

export type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: any;
};

/**
 * Mencatat transaksi baru (Pribadi atau Bersama) dengan dukungan kategori dinamis & upload bukti transfer
 */
export async function createTransaction(formData: FormData): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const destination = (formData.get('destination') as string)?.trim(); // 'personal' or groupId
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
    return { error: 'Silakan pilih tujuan tabungan (Pribadi atau Bersama).' };
  }

  const adminClient = createAdminClient();

  // 2. Resolve Category Dinamis (cari ID jika ada, atau buat baru di tabel categories)
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
          scope_type: destination === 'personal' ? 'PERSONAL' : 'SHARED',
          transaction_type:
            type === 'in'
              ? destination === 'personal'
                ? 'INCOME'
                : 'CONTRIBUTION'
              : 'EXPENSE',
        })
        .select('id')
        .single();
      if (newCat) categoryId = newCat.id;
    }
  }

  // 3. Kasus Tabungan Pribadi
  if (destination === 'personal') {
    let { data: ledger } = await adminClient
      .from('personal_ledgers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ledger) {
      const { data: newLedger } = await adminClient
        .from('personal_ledgers')
        .insert({ user_id: user.id, name: 'Keuangan Pribadi' })
        .select('id')
        .single();
      ledger = newLedger;
    }

    if (!ledger) {
      return { error: 'Buku tabungan pribadi tidak ditemukan.' };
    }

    const transactionType = type === 'in' ? 'INCOME' : 'EXPENSE';

    const { data: tx, error: txErr } = await adminClient
      .from('transactions')
      .insert({
        scope_type: 'PERSONAL',
        personal_ledger_id: ledger.id,
        group_id: null,
        created_by_user_id: user.id,
        contributor_user_id: null,
        transaction_type: transactionType,
        amount,
        category_id: categoryId,
        transaction_date: transactionDate,
        description,
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (txErr || !tx) {
      return { error: 'Gagal menyimpan transaksi: ' + (txErr?.message || 'Error') };
    }

    // Upload Bukti Struk jika ada
    let receiptUrl: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      receiptUrl = await handleReceiptUpload(adminClient, tx.id, receiptFile);
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      actor_user_id: user.id,
      entity_type: 'TRANSACTION',
      entity_id: tx.id,
      action: 'CREATE',
      after_data: {
        scope_type: 'PERSONAL',
        transaction_type: transactionType,
        amount,
        description,
        receipt_url: receiptUrl,
      },
    });

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/personal');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/reports');
    return { success: true, data: { id: tx.id, receipt_url: receiptUrl } };
  }

  // 4. Kasus Tabungan Bersama (Grup)
  const groupId = destination;

  // Verifikasi keanggotaan aktif
  const { data: membership } = await adminClient
    .from('savings_group_members')
    .select('role, status')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return { error: 'Anda bukan anggota aktif pada tabungan bersama ini.' };
  }

  const transactionType = type === 'in' ? 'CONTRIBUTION' : 'EXPENSE';

  // Validasi pencegahan saldo negatif (BR-04) bila pengeluaran
  if (transactionType === 'EXPENSE') {
    const [{ data: groupRow }, { data: groupTxs }] = await Promise.all([
      adminClient.from('savings_groups').select('opening_balance').eq('id', groupId).single(),
      adminClient
        .from('transactions')
        .select('amount, transaction_type')
        .eq('group_id', groupId)
        .eq('status', 'ACTIVE'),
    ]);

    const openingBalance = Number(groupRow?.opening_balance ?? 0);
    const currentBalance = (groupTxs ?? []).reduce((acc, t) => {
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
        error: `Saldo tabungan bersama tidak mencukupi untuk pengeluaran ini. (Saldo saat ini: ${formatRp})`,
      };
    }
  }

  // Multi-Approval: Jika pengeluaran kas grup dan anggota lebih dari 1, butuh persetujuan
  let initialStatus = 'ACTIVE';
  let requiresApproval = false;

  if (transactionType === 'EXPENSE') {
    const { count: memberCount } = await adminClient
      .from('savings_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'ACTIVE');

    if (memberCount && memberCount > 1) {
      initialStatus = 'PENDING_APPROVAL';
      requiresApproval = true;
    }
  }

  const { data: tx, error: txErr } = await adminClient
    .from('transactions')
    .insert({
      scope_type: 'SHARED',
      personal_ledger_id: null,
      group_id: groupId,
      created_by_user_id: user.id,
      contributor_user_id: transactionType === 'CONTRIBUTION' ? user.id : null,
      transaction_type: transactionType,
      amount,
      category_id: categoryId,
      transaction_date: transactionDate,
      description,
      status: initialStatus,
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    return { error: 'Gagal mencatat transaksi bersama: ' + (txErr?.message || 'Error') };
  }

  // Upload Bukti Struk jika ada
  let receiptUrl: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    receiptUrl = await handleReceiptUpload(adminClient, tx.id, receiptFile);
  }

  // Audit log
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: groupId,
    entity_type: 'TRANSACTION',
    entity_id: tx.id,
    action: requiresApproval ? 'SUBMIT_FOR_APPROVAL' : 'CREATE',
    after_data: {
      scope_type: 'SHARED',
      transaction_type: transactionType,
      amount,
      description,
      receipt_url: receiptUrl,
      requires_approval: requiresApproval,
      status: initialStatus,
    },
  });

  revalidatePath('/dashboard', 'layout');
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
    .select('id, scope_type, group_id, created_by_user_id, status, amount, transaction_type')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (tx.status === 'VOIDED') {
    return { error: 'Transaksi ini sudah pernah dibatalkan sebelumnya.' };
  }

  // 2. Cek otorisasi
  if (tx.scope_type === 'PERSONAL') {
    if (tx.created_by_user_id !== user.id) {
      return { error: 'Anda tidak berhak membatalkan transaksi milik orang lain.' };
    }
  } else if (tx.scope_type === 'SHARED') {
    const { data: member } = await adminClient
      .from('savings_group_members')
      .select('role')
      .eq('group_id', tx.group_id)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    const isCreator = tx.created_by_user_id === user.id;
    const isOwner = member?.role === 'OWNER';

    if (!isCreator && !isOwner) {
      return {
        error: 'Hanya pembuat transaksi atau pemilik grup yang dapat membatalkan transaksi ini.',
      };
    }
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
    actor_user_id: user.id,
    group_id: tx.group_id,
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
 * Memperbarui data transaksi personal (Nominal, Kategori, Keterangan, Tanggal, Jenis, Metode)
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
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (tx.scope_type !== 'PERSONAL' || tx.created_by_user_id !== user.id) {
    return { error: 'Anda hanya dapat mengubah transaksi personal milik Anda sendiri.' };
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
      description: payload.description?.trim() || null,
      transaction_date: payload.transactionDate || tx.transaction_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (updateErr) {
    return { error: 'Gagal memperbarui transaksi: ' + updateErr.message };
  }

  // 4. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: null,
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
    reason: 'Perubahan rincian transaksi personal oleh pemilik akun',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');
  return { success: true };
}

