# Business Rules

## 1. Pemisahan saldo
- BR-01: Saldo pribadi dan saldo tabungan bersama merupakan buku pencatatan yang terpisah.
- BR-02: Transaksi pribadi tidak mengubah saldo grup.
- BR-03: Transaksi grup tidak mengubah saldo pribadi.
- BR-04: Pemindahan antar buku tidak dilakukan otomatis pada MVP. Jika kelak dibuat, harus menjadi fitur transfer eksplisit dengan dua entri yang terhubung.

## 2. Perhitungan
- Saldo pribadi = saldo awal + pemasukan aktif - pengeluaran aktif.
- Saldo bersama = total setoran aktif + penyesuaian aktif - total pengeluaran aktif.
- Semua nominal harus positif; jenis transaksi menentukan apakah nilainya menambah atau mengurangi saldo.
- Gunakan `NUMERIC/DECIMAL` untuk nominal uang.
- Semua transaksi menggunakan satu mata uang per buku/grup pada MVP; default dapat ditetapkan IDR.

## 3. Hak akses tabungan bersama
- Semua anggota berstatus `ACTIVE` dapat melihat saldo, anggota, dan riwayat transaksi.
- Semua anggota `ACTIVE` dapat mencatat setoran dan pengeluaran tanpa approval.
- Tidak ada role bendahara yang wajib ada.
- Owner berwenang mengatur detail grup, undangan, keanggotaan, dan arsip grup.
- Role owner tidak memberikan hak untuk mengubah transaksi anggota secara diam-diam.
- Hak edit/void transaksi perlu ditetapkan secara eksplisit. Rekomendasi MVP: pembuat transaksi dapat mengedit/membatalkan transaksi miliknya; owner dapat melakukan void administratif dengan alasan yang wajib dicatat. Semua anggota dapat melihat audit trail yang relevan.

## 4. Pengeluaran dan saldo negatif
- Rekomendasi default MVP: saldo tercatat tidak boleh negatif.
- Server memeriksa saldo dalam transaksi database yang aman terhadap race condition.
- Jika kelompok ingin mengizinkan saldo negatif, perilaku itu harus menjadi pengaturan grup yang eksplisit, bukan asumsi diam-diam.

## 5. Undangan
- Undangan memiliki status, waktu kedaluwarsa, pembuat, dan token yang disimpan secara aman.
- Token hanya dapat digunakan sesuai jumlah penggunaan yang ditetapkan; rekomendasi satu kali.
- Undangan yang dicabut/kedaluwarsa tidak dapat digunakan.
- Keanggotaan unik per kombinasi grup dan pengguna.
- Hanya owner atau anggota yang diberi izin mengundang yang dapat membuat undangan; default MVP: owner.

## 6. Audit dan pembatalan
- Transaksi yang telah disimpan tidak dihapus permanen melalui antarmuka.
- Pembatalan mengubah status menjadi `VOIDED` dan menyimpan alasan.
- Audit log mencatat aktor, tindakan, entitas, waktu, serta ringkasan perubahan.
- Audit log tidak boleh dapat diedit oleh pengguna biasa.

## 7. Penutupan grup
- Grup yang diarsipkan menjadi read-only untuk transaksi baru.
- Riwayat tetap dapat dilihat anggota sesuai kebijakan.
- MVP tidak menentukan pembagian atau transfer saldo nyata saat grup ditutup; aplikasi hanya menyajikan saldo catatan terakhir dan laporan.

## 8. Makna saldo
Saldo dalam aplikasi merupakan hasil catatan yang dimasukkan pengguna. Saldo tidak membuktikan bahwa dana tersebut tersedia di rekening, dompet digital, atau kas fisik.
