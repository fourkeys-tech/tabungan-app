# Business Requirements

## 1. Masalah yang ingin diselesaikan
Pengguna sering mencatat keuangan pribadi dan uang patungan di tempat berbeda, sehingga saldo, kontribusi, dan riwayat pengeluaran sulit ditelusuri. Aplikasi menyatukan pencatatan tersebut dalam satu akun dengan ruang pribadi dan ruang bersama yang terpisah.

## 2. Sasaran bisnis
- Memudahkan pencatatan keuangan sehari-hari.
- Mengurangi perbedaan informasi saldo dalam kelompok.
- Memperjelas siapa yang mencatat transaksi dan kapan transaksi dibuat/diubah.
- Menyediakan fondasi produk yang dapat dikembangkan tanpa mengubah konsep dasar.

## 3. Stakeholder
- Pengguna individu.
- Anggota tabungan bersama.
- Pemilik/pembuat grup.
- Operator teknis sistem untuk pemeliharaan dan keamanan, bukan pengelola transaksi pengguna.

## 4. Kebutuhan bisnis
| ID | Kebutuhan | Prioritas |
|---|---|---|
| BR-01 | Pengguna dapat mencatat pemasukan dan pengeluaran pribadi. | Must |
| BR-02 | Pengguna dapat membuat tabungan bersama. | Must |
| BR-03 | Pengguna dapat mengundang orang lain melalui undangan yang aman. | Must |
| BR-04 | Anggota aktif dapat mencatat setoran dan pengeluaran bersama tanpa approval. | Must |
| BR-05 | Anggota aktif dapat melihat saldo dan riwayat grup. | Must |
| BR-06 | Sistem menampilkan kontribusi berdasarkan anggota pencatat setoran. | Must |
| BR-07 | Sistem menyimpan audit trail perubahan transaksi. | Must |
| BR-08 | Pengguna dapat melihat laporan dasar berdasarkan rentang tanggal. | Should |
| BR-09 | Pengguna dapat menetapkan target tabungan bersama. | Could |
| BR-10 | Sistem dapat diintegrasikan dengan layanan pembayaran pada fase berikutnya. | Later |

## 5. Indikator keberhasilan awal
- Pengguna dapat menyelesaikan pencatatan transaksi tanpa bantuan.
- Saldo yang ditampilkan sesuai dengan penjumlahan transaksi aktif.
- Anggota grup dapat melihat data grup sesuai status keanggotaannya.
- Transaksi tidak dapat diubah tanpa jejak audit.
- Tidak ada endpoint transaksi grup yang menerima permintaan dari non-anggota.

## 6. Risiko bisnis
- Pengguna salah memahami saldo aplikasi sebagai saldo rekening nyata.
- Anggota memasukkan transaksi yang tidak sesuai kondisi uang sebenarnya.
- Konflik kelompok saat mengoreksi atau membatalkan transaksi.
- Undangan dibagikan ke orang yang salah.
- Penghapusan akun atau keluarnya anggota menimbulkan masalah pada riwayat lama.

## 7. Mitigasi
- Tampilkan label yang jelas: “Saldo tercatat di aplikasi”.
- Simpan pencatat, waktu, deskripsi, dan audit trail.
- Gunakan pembatalan/void daripada hard delete untuk transaksi yang sudah tercatat.
- Undangan memiliki masa berlaku dan dapat dicabut.
- Riwayat keuangan tetap utuh walaupun anggota keluar; identitas historis dipertahankan secara minimal sesuai kebijakan privasi.
