'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function seedUserData() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const userId = user.id;
  const adminClient = createAdminClient();

  // 1. Dapatkan personal ledger user (atau buat jika belum ada)
  let { data: ledger } = await adminClient
    .from('personal_ledgers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ledger) {
    const { data: newLedger } = await adminClient
      .from('personal_ledgers')
      .insert({ user_id: userId, name: 'Keuangan Pribadi' })
      .select('id')
      .single();
    ledger = newLedger;
  }

  if (!ledger) {
    return { error: 'Personal ledger not found' };
  }

  const ledgerId = ledger.id;

  // 2. Buat grup tabungan bersama
  const { data: group } = await adminClient
    .from('savings_groups')
    .insert({
      name: 'Tabungan Liburan ke Bali',
      description: 'Untuk akhir tahun',
      owner_user_id: userId,
      target_amount: 5000000,
      target_date: '2026-12-31'
    })
    .select('id')
    .single();

  if (group) {
    // Jadikan member
    await adminClient.from('savings_group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'OWNER'
    });
  }

  // 3. Buat Kategori
  const { data: catMasuk } = await adminClient.from('categories').insert({ owner_user_id: userId, name: 'Gaji', scope_type: 'PERSONAL', transaction_type: 'INCOME' }).select('id').single();
  const { data: catMakan } = await adminClient.from('categories').insert({ owner_user_id: userId, name: 'Makanan', scope_type: 'PERSONAL', transaction_type: 'EXPENSE' }).select('id').single();
  const { data: catTransport } = await adminClient.from('categories').insert({ owner_user_id: userId, name: 'Transportasi', scope_type: 'PERSONAL', transaction_type: 'EXPENSE' }).select('id').single();

  // 4. Masukkan Transaksi Dummy
  await adminClient.from('transactions').insert([
    {
      scope_type: 'PERSONAL',
      personal_ledger_id: ledgerId,
      created_by_user_id: userId,
      transaction_type: 'INCOME',
      amount: 4500000,
      category_id: catMasuk?.id,
      transaction_date: '2026-10-01',
      description: 'Gaji Bulan Oktober'
    },
    {
      scope_type: 'PERSONAL',
      personal_ledger_id: ledgerId,
      created_by_user_id: userId,
      transaction_type: 'EXPENSE',
      amount: 150000,
      category_id: catMakan?.id,
      transaction_date: '2026-10-02',
      description: 'Makan Malam'
    },
    {
      scope_type: 'PERSONAL',
      personal_ledger_id: ledgerId,
      created_by_user_id: userId,
      transaction_type: 'EXPENSE',
      amount: 50000,
      category_id: catTransport?.id,
      transaction_date: '2026-10-03',
      description: 'Isi Bensin'
    },
    {
      scope_type: 'PERSONAL',
      personal_ledger_id: ledgerId,
      created_by_user_id: userId,
      transaction_type: 'EXPENSE',
      amount: 50000,
      category_id: catMakan?.id,
      transaction_date: '2026-10-05',
      description: 'Ngopi'
    }
  ]);

  if (group) {
    await adminClient.from('transactions').insert([
      {
        scope_type: 'SHARED',
        group_id: group.id,
        created_by_user_id: userId,
        contributor_user_id: userId,
        transaction_type: 'CONTRIBUTION',
        amount: 500000,
        transaction_date: '2026-10-05',
        description: 'Setoran Pertama Liburan'
      }
    ]);
  }

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
