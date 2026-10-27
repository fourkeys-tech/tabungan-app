import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = line.split('=')[1].trim();
  }
});

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('Mendaftarkan user admin (bypass rate limit)...');
  
  // Create user using Admin API
  const { data: userResponse, error: createError } = await supabase.auth.admin.createUser({
    email: 'admin@tabungku.com',
    password: 'adminpassword123',
    email_confirm: true,
    user_metadata: { name: 'Admin TabungKu' }
  });

  if (createError) {
    if (!createError.message.includes("already registered")) {
        console.error('Gagal membuat user admin:', createError.message);
        return;
    } else {
        console.log('User admin sudah ada, mengambil data...');
    }
  }

  // Retrieve user id just in case it already existed
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return console.error(listError);
  
  const adminUser = users.users.find(u => u.email === 'admin@tabungku.com');
  if (!adminUser) return console.error('Admin user not found after creation.');
  
  const userId = adminUser.id;
  console.log('Admin user ID:', userId);

  // We should wait briefly to let triggers create personal_ledger and profile
  console.log('Menunggu database triggers bekerja...');
  await new Promise(r => setTimeout(r, 2000));

  // Seed Data manually via Admin API
  const { data: ledger } = await supabase
    .from('personal_ledgers')
    .select('id')
    .eq('user_id', userId)
    .single();

  let ledgerId;
  if (!ledger) {
      console.log('Ledger tidak ditemukan, membuat manual...');
      const { data: newLedger } = await supabase.from('personal_ledgers').insert({ user_id: userId, name: 'Keuangan Admin' }).select('id').single();
      if(newLedger) ledgerId = newLedger.id;
  } else {
      ledgerId = ledger.id;
  }

  if(!ledgerId) return console.error("Gagal mendapatkan Ledger ID.");

  console.log('Membuat Tabungan Bersama...');
  const { data: group } = await supabase
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
    await supabase.from('savings_group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'OWNER'
    });
  }

  console.log('Menyiapkan Kategori...');
  const { data: catMasuk } = await supabase.from('categories').insert({ owner_user_id: userId, name: 'Gaji', scope_type: 'PERSONAL', transaction_type: 'INCOME' }).select('id').single();
  const { data: catMakan } = await supabase.from('categories').insert({ owner_user_id: userId, name: 'Makanan', scope_type: 'PERSONAL', transaction_type: 'EXPENSE' }).select('id').single();
  const { data: catTransport } = await supabase.from('categories').insert({ owner_user_id: userId, name: 'Transportasi', scope_type: 'PERSONAL', transaction_type: 'EXPENSE' }).select('id').single();

  console.log('Menginjeksi Transaksi dummy...');
  await supabase.from('transactions').insert([
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
    }
  ]);

  if (group) {
      await supabase.from('transactions').insert([
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

  console.log('\n✅ SEED MIGRATION SELESAI!');
  console.log('------------------------------------');
  console.log('SILAKAN LOGIN DENGAN:');
  console.log('Email: admin@tabungku.com');
  console.log('Password: adminpassword123');
}

main();
