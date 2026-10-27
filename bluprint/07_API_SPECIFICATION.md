# API Specification (Draft)

REST API dengan prefix `/api/v1`. Semua endpoint kecuali registrasi/login dan penerimaan undangan publik yang ditentukan harus memerlukan autentikasi.

## 1. Format umum
- Request/response JSON.
- Nominal dikirim sebagai string desimal untuk menghindari presisi floating point.
- Tanggal transaksi memakai `YYYY-MM-DD`.
- Error memiliki bentuk konsisten: `code`, `message`, dan `details` opsional.
- Pagination menggunakan `limit` dan `cursor` atau `page`.
- Endpoint mutasi harus memvalidasi otorisasi di server.

## 2. Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` jika memakai refresh token
- `GET /auth/me`

Keamanan detail session/token ditentukan pada implementasi; cookie HttpOnly, Secure, dan SameSite layak diprioritaskan untuk aplikasi web.

## 3. Tabungan pribadi
- `GET /personal/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /personal/transactions`
- `POST /personal/transactions`
- `GET /personal/transactions/:transactionId`
- `PATCH /personal/transactions/:transactionId`
- `POST /personal/transactions/:transactionId/void`
- `GET /personal/reports/cashflow`

Contoh payload pembuatan transaksi:
```json
{
  "transactionType": "INCOME",
  "amount": "500000.00",
  "categoryId": "uuid",
  "transactionDate": "2026-10-09",
  "description": "Gaji"
}
```

## 4. Tabungan bersama
- `POST /groups`
- `GET /groups`
- `GET /groups/:groupId`
- `PATCH /groups/:groupId`
- `POST /groups/:groupId/invitations`
- `GET /groups/:groupId/invitations`
- `POST /invitations/:token/accept`
- `POST /groups/:groupId/invitations/:invitationId/revoke`
- `GET /groups/:groupId/members`
- `POST /groups/:groupId/members/:userId/remove`
- `POST /groups/:groupId/leave`
- `GET /groups/:groupId/summary`
- `GET /groups/:groupId/transactions`
- `POST /groups/:groupId/transactions`
- `GET /groups/:groupId/transactions/:transactionId`
- `PATCH /groups/:groupId/transactions/:transactionId`
- `POST /groups/:groupId/transactions/:transactionId/void`
- `GET /groups/:groupId/reports/contributions`
- `GET /groups/:groupId/reports/cashflow`
- `POST /groups/:groupId/archive`

## 5. Contoh transaksi bersama
```json
{
  "transactionType": "CONTRIBUTION",
  "amount": "200000.00",
  "contributorUserId": "uuid-anggota",
  "categoryId": "uuid",
  "transactionDate": "2026-10-09",
  "description": "Setoran mingguan"
}
```

Contoh pengeluaran:
```json
{
  "transactionType": "EXPENSE",
  "amount": "75000.00",
  "categoryId": "uuid",
  "transactionDate": "2026-10-09",
  "description": "Belanja kebutuhan bersama"
}
```

## 6. Aturan endpoint transaksi
- Tidak ada endpoint approval atau status `PENDING_APPROVAL`.
- Setiap request transaksi grup memerlukan anggota aktif.
- Pengeluaran dan setoran tersimpan langsung setelah validasi berhasil.
- Validasi saldo negatif dilakukan secara atomik di backend.
- Server menentukan `createdByUserId`; jangan percaya nilai aktor dari payload klien.
- Perubahan atau void harus menghasilkan audit log.
- Gunakan idempotency key untuk mencegah duplikasi transaksi saat retry bila diperlukan.

## 7. Kode status yang disarankan
- `200 OK`: pembacaan/perubahan berhasil.
- `201 Created`: data berhasil dibuat.
- `400 Bad Request`: payload tidak valid.
- `401 Unauthorized`: belum login/token tidak valid.
- `403 Forbidden`: tidak memiliki hak akses.
- `404 Not Found`: data tidak ditemukan atau sengaja disamarkan untuk mencegah enumerasi.
- `409 Conflict`: saldo tidak cukup, undangan sudah digunakan, atau konflik status.
- `422 Unprocessable Entity`: validasi semantik gagal.
- `429 Too Many Requests`: rate limit.

## 8. Catatan keamanan
- Cek otorisasi per objek, bukan hanya login.
- Jangan menerima `groupId`, `userId`, atau `createdByUserId` sebagai bukti hak akses.
- Rate limit login dan penerimaan undangan.
- Token undangan tidak boleh tercatat dalam log.
