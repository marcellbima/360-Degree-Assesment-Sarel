# PRODUCT REQUIREMENT DOCUMENT

## 360 Degree Assessment & Quiz Management System

### PT Sarel Sentra Inspira

---

## 1. Informasi Dokumen

**Nama produk:** 360 Degree Assessment & Quiz Management System
**Nama singkat:** Sarel Assessment
**Pemilik produk:** PT Sarel Sentra Inspira
**Bahasa antarmuka:** Bahasa Indonesia
**Deployment tahap awal:** Cloudflare
**Deployment masa depan:** Docker Compose di mini PC
**Status dokumen:** Initial PRD
**Tujuan dokumen:** Menjadi sumber kebutuhan utama untuk perancangan, pengembangan, pengujian, dan deployment aplikasi.

---

## 2. Ringkasan Produk

Aplikasi ini merupakan web application untuk penyelenggaraan assessment 360 derajat dan quiz berbasis web.

Aplikasi harus memiliki:

* Login berbasis User ID dan password.
* Role Superadmin, Admin, dan User.
* Pengelolaan akun peserta.
* Pengelolaan batch assessment yang jumlahnya dapat dikustomisasi.
* Pengelolaan jenis assessment.
* Pengelolaan relasi penilai dan peserta.
* Pengelolaan quiz.
* Quiz sebanyak 40 soal yang dibagi menjadi 4 halaman.
* Setiap halaman quiz berisi 10 soal.
* Autosave jawaban.
* Monitoring progres pengisian.
* Dashboard berdasarkan target, realisasi, persentase, dan status submitted.
* Monitoring assessment berdasarkan Self, Superior, Peer, dan Subordinate.
* Import dan ekspor data.
* Audit log.
* Sistem keamanan yang kuat.
* Deployment sementara pada Cloudflare.
* Struktur aplikasi yang dapat dipindahkan ke Docker di mini PC tanpa membangun ulang aplikasi.

Aplikasi harus menggunakan tema visual yang telah disepakati sebelumnya:

* Sidebar navy gelap.
* Warna utama biru.
* Background putih dan abu-abu terang.
* Card membulat.
* Tampilan modern, profesional, bersih, dan mudah digunakan.
* Mobile responsive.
* Dashboard mengikuti pola monitoring sebelumnya, tetapi hanya menampilkan data utama yang benar-benar dibutuhkan.

---

## 3. Tujuan Produk

Aplikasi dibangun untuk:

1. Mempermudah penyelenggaraan assessment 360 derajat.
2. Menggantikan proses pengisian menggunakan banyak Google Forms.
3. Mengelola peserta, penilai, batch, assessment, dan quiz dalam satu sistem.
4. Memantau progres pengisian secara terpusat.
5. Menampilkan target dan realisasi pengisian.
6. Mengurangi risiko data tidak lengkap.
7. Memudahkan Admin mengidentifikasi peserta atau penilai yang belum mengisi.
8. Memudahkan proses ekspor data untuk analisis lanjutan.
9. Memberikan sistem yang aman dan dapat dikembangkan.
10. Menyediakan deployment testing yang murah melalui Cloudflare.
11. Memungkinkan migrasi ke Docker di mini PC tanpa mengganti keseluruhan aplikasi.

---

## 4. Ruang Lingkup MVP

Versi MVP wajib mencakup:

* Authentication.
* Role dan permission.
* Manajemen User.
* Manajemen Admin.
* Manajemen batch.
* Manajemen program assessment.
* Manajemen jenis assessment.
* Manajemen peserta.
* Manajemen relasi penilai.
* Quiz dan assessment player.
* Autosave.
* Resume attempt.
* Monitoring progres.
* Dashboard assessment.
* Detail progres per peserta.
* Import Excel atau CSV.
* Ekspor Excel atau CSV.
* Audit log.
* Deployment Cloudflare.
* Struktur portable untuk deployment Docker masa depan.

Fitur yang belum wajib pada MVP:

* WhatsApp automation.
* Email notification.
* Advanced psychometric analysis.
* Mobile native application.
* AI-based scoring.
* Full anti-cheat proctoring.
* Video call integration.
* Real-time WebSocket penuh.
* Native Google Drive file browser.

---

## 5. Target Pengguna

### 5.1 Superadmin

Superadmin memiliki akses penuh terhadap seluruh sistem.

Superadmin dapat:

* Login ke aplikasi.
* Membuat, melihat, mengubah, menonaktifkan, dan menghapus Admin.
* Membuat, melihat, mengubah, menonaktifkan, dan menghapus User.
* Membuat dan mengelola batch.
* Membuat dan mengelola program assessment.
* Membuat dan mengelola jenis assessment.
* Membuat quiz.
* Mengelola bank soal.
* Menentukan peserta assessment.
* Menentukan penilai.
* Menentukan relasi Self, Superior, Peer, dan Subordinate.
* Melihat seluruh dashboard.
* Melihat seluruh progres.
* Melihat detail peserta.
* Mengatur target penilai.
* Mengubah konfigurasi aplikasi.
* Mengimpor data.
* Mengekspor data.
* Melakukan reset password.
* Melakukan reset attempt.
* Membuka kembali assessment.
* Melakukan force submit.
* Melihat audit log.
* Mengatur branding aplikasi.
* Mengelola role dan permission.
* Melihat status sistem.
* Melihat informasi backup.

### 5.2 Admin

Admin memiliki akses sesuai scope yang diberikan oleh Superadmin.

Admin dapat:

* Login ke aplikasi.
* Melihat dashboard sesuai scope.
* Membuat User sesuai scope.
* Mengubah User sesuai scope.
* Mengimpor peserta sesuai scope.
* Mengelola batch yang diberikan.
* Mengelola relasi penilai.
* Memantau progres.
* Melihat detail peserta.
* Mengekspor laporan.
* Mereset password User.
* Mereset attempt jika memiliki izin.
* Melakukan force submit jika memiliki izin.
* Mengelola quiz jika memiliki izin.

Admin tidak dapat:

* Membuat Superadmin.
* Mengubah konfigurasi global tanpa izin.
* Mengakses data di luar scope.
* Melihat data Admin lain tanpa izin.
* Mengubah permission dirinya sendiri.
* Mengakses secret sistem.

### 5.3 User

User dapat memiliki satu atau lebih fungsi:

* Sebagai peserta yang dinilai.
* Sebagai penilai Self.
* Sebagai penilai Superior.
* Sebagai penilai Peer.
* Sebagai penilai Subordinate.
* Sebagai peserta quiz.

User dapat:

* Login menggunakan User ID dan password.
* Mengubah password.
* Melihat daftar assessment atau quiz yang ditugaskan.
* Melihat instruksi.
* Memulai assessment.
* Mengisi jawaban.
* Melanjutkan pengerjaan.
* Melihat progres.
* Submit assessment.
* Melihat status penyelesaian.
* Melihat hasil jika diizinkan.

User tidak dapat:

* Melihat jawaban User lain.
* Mengubah jawaban setelah submit.
* Mengakses data di luar assignment.
* Mengakses dashboard Admin.
* Mengubah target penilai.
* Melihat kunci jawaban selama quiz berlangsung.

---

## 6. Konsep Program, Batch, dan Assessment

### 6.1 Program

Program merupakan wadah utama kegiatan assessment.

Contoh:

* 360 Degree Assessment 2026.
* Qualified Trainer Clustering.
* Leadership Assessment.
* Knowledge Assessment.

Data program:

* Program ID.
* Nama program.
* Kode program.
* Deskripsi.
* Tahun.
* Tanggal mulai.
* Tanggal selesai.
* Status.
* Pemilik program.
* Branding opsional.
* Created by.
* Created at.
* Updated at.

Status program:

* Draft.
* Active.
* Closed.
* Archived.

### 6.2 Batch

Setiap program dapat memiliki jumlah batch yang fleksibel.

Tidak boleh di-hardcode menjadi Batch 1, Batch 2, atau Batch 3 saja.

Superadmin dapat:

* Membuat batch tanpa batas tertentu.
* Menentukan nama batch.
* Menentukan kode batch.
* Menentukan urutan batch.
* Menentukan tanggal mulai.
* Menentukan tanggal selesai.
* Menentukan status.
* Menentukan peserta.
* Menentukan target assessment.
* Mengaktifkan atau menonaktifkan batch.
* Menyalin konfigurasi batch.
* Mengarsipkan batch.

Contoh:

* Batch 1.
* Batch 2.
* Batch A.
* Batch Jakarta.
* Batch Main Dealer Barat.
* Batch Leadership Level 1.

Data batch:

* Batch ID.
* Program ID.
* Nama batch.
* Kode batch.
* Deskripsi.
* Urutan.
* Tanggal mulai.
* Tanggal selesai.
* Status.
* Target peserta.
* Created by.
* Created at.
* Updated at.

Status batch:

* Draft.
* Upcoming.
* Active.
* Closed.
* Archived.

### 6.3 Jenis Assessment

Sistem minimal mendukung:

* Self.
* Superior.
* Peer.
* Subordinate.
* Quiz atau Knowledge Assessment.

Jenis assessment harus dapat dikustomisasi.

Superadmin dapat menambah jenis assessment baru tanpa mengubah kode.

Data jenis assessment:

* Assessment Type ID.
* Nama.
* Kode.
* Deskripsi.
* Warna.
* Icon.
* Urutan.
* Active status.
* Default target.
* Is self assessment.
* Requires evaluator relation.
* Created at.
* Updated at.

---

## 7. Konsep Assessment 360 Derajat

### 7.1 Participant

Participant adalah individu yang menjadi objek penilaian.

Data participant:

* User ID.
* Employee ID atau NPK.
* Nama lengkap.
* Jabatan.
* Unit kerja.
* Divisi.
* Organisasi.
* Batch.
* Program.
* Status aktif.
* Email.
* Nomor telepon opsional.

### 7.2 Evaluator

Evaluator adalah User yang memberikan penilaian kepada participant.

Evaluator dapat berperan sebagai:

* Self.
* Superior.
* Peer.
* Subordinate.

### 7.3 Evaluator Relation

Relasi evaluator harus ditentukan secara eksplisit.

Data relasi:

* Program ID.
* Batch ID.
* Participant ID.
* Evaluator ID.
* Assessment Type ID.
* Target count.
* Status.
* Assigned at.
* Assigned by.

Aturan:

* Satu participant dapat memiliki satu Self.
* Satu participant dapat memiliki satu atau lebih Superior.
* Satu participant dapat memiliki satu atau lebih Peer.
* Satu participant dapat memiliki satu atau lebih Subordinate.
* Jumlah target setiap kategori dapat dikustomisasi.
* Satu evaluator dapat menilai lebih dari satu participant.
* Evaluator hanya dapat melihat assignment yang diberikan kepadanya.
* Assignment dapat dinonaktifkan.
* Assignment dapat diimpor melalui Excel.

### 7.4 Target dan Realisasi

Untuk setiap participant dan jenis assessment, sistem menghitung:

* Target penilai.
* Jumlah realisasi.
* Jumlah submitted.
* Jumlah belum submit.
* Persentase progres.

Rumus:

Persentase progres = jumlah submitted dibagi target dikali 100.

Jika target 0, sistem tidak boleh menghasilkan error pembagian nol.

Status progres:

* Belum dimulai.
* Dalam proses.
* Sebagian selesai.
* Selesai.
* Melebihi target.
* Tidak memiliki target.

---

## 8. Data Utama Dashboard

Dashboard harus memprioritaskan data yang terlihat pada referensi monitoring sebelumnya.

Informasi utama yang wajib ditampilkan:

### 8.1 Filter Utama

* Program.
* Batch.
* Assessment Type.
* Nama participant.
* NPK atau User ID.
* Unit kerja.
* Jabatan.
* Status progres.

Jumlah batch harus dinamis.

Filter batch tidak boleh di-hardcode.

### 8.2 Ringkasan Program

Tampilkan:

* Total participant.
* Total target.
* Total submitted.
* Total belum submitted.
* Persentase progres keseluruhan.

### 8.3 Ringkasan Berdasarkan Jenis Assessment

Tampilkan card atau tabel untuk:

* Total Progress.
* Self.
* Superior.
* Peer.
* Subordinate.

Setiap bagian menampilkan:

* Target.
* Realisasi atau submitted.
* Belum submitted.
* Persentase.

Contoh struktur:

| Assessment  | Target | Submitted | Belum Submit | Persentase |
| ----------- | -----: | --------: | -----------: | ---------: |
| Self        |    100 |        90 |           10 |        90% |
| Superior    |    200 |       160 |           40 |        80% |
| Peer        |    300 |       240 |           60 |        80% |
| Subordinate |    150 |       120 |           30 |        80% |

### 8.4 Chart Utama

Chart hanya menggunakan data utama yang tersedia.

Chart yang wajib:

1. Progress Total per Batch.
2. Target dibanding Submitted.
3. Progress per Jenis Assessment.
4. Distribusi status participant.
5. Progress participant tertinggi dan terendah.

Chart opsional:

* Trend submit per hari.
* Progress berdasarkan unit kerja.
* Progress berdasarkan jabatan.
* Heatmap progres.

Chart opsional tidak ditampilkan pada MVP kecuali dibutuhkan.

### 8.5 Detail Progres Participant

Tabel detail wajib menampilkan:

* Nomor.
* NPK atau User ID.
* Nama participant.
* Jabatan.
* Unit kerja.
* Batch.
* Target Self.
* Submitted Self.
* Persentase Self.
* Target Superior.
* Submitted Superior.
* Persentase Superior.
* Target Peer.
* Submitted Peer.
* Persentase Peer.
* Target Subordinate.
* Submitted Subordinate.
* Persentase Subordinate.
* Total target.
* Total submitted.
* Total persentase.
* Status.
* Action detail.

Tabel harus mendukung:

* Search.
* Pagination.
* Sorting.
* Filter.
* Export.
* Sticky header.
* Horizontal scroll.
* Responsive layout.

### 8.6 Detail Participant

Ketika Admin membuka detail participant, tampilkan:

* Identitas participant.
* Program.
* Batch.
* Jabatan.
* Unit kerja.
* Ringkasan total progres.
* Ringkasan Self.
* Ringkasan Superior.
* Ringkasan Peer.
* Ringkasan Subordinate.
* Daftar evaluator.
* Status evaluator.
* Waktu mulai.
* Aktivitas terakhir.
* Waktu submit.
* Riwayat perubahan assignment.
* Riwayat reset.

Data jawaban tidak ditampilkan pada dashboard progress utama.

---

## 9. Dashboard Visual

### 9.1 Tema

Gunakan:

* Sidebar navy gelap.
* Primary biru.
* Background abu-abu muda.
* Card putih.
* Border abu-abu terang.
* Sudut membulat.
* Shadow lembut.
* Font modern.
* Spacing lega.
* Chart dengan warna konsisten.

### 9.2 Sidebar

Menu Superadmin:

* Dashboard.
* Program.
* Batch.
* Assessment.
* Participant.
* Evaluator.
* Quiz.
* Monitoring.
* Report.
* Import.
* Export.
* Users.
* Admin.
* Audit Log.
* Settings.

Menu Admin menyesuaikan permission.

Menu User:

* Dashboard.
* Assessment Saya.
* Quiz Saya.
* Riwayat.
* Profil.

### 9.3 Header

Header menampilkan:

* Judul halaman.
* Breadcrumb.
* Program aktif.
* Batch aktif.
* Tombol refresh.
* Timestamp update terakhir.
* Profil User.
* Logout.

### 9.4 Responsive

Desktop:

* Sidebar tetap.
* Dashboard multi-column.
* Tabel penuh.

Tablet:

* Sidebar collapsible.
* Card dua kolom.

Mobile:

* Sidebar drawer.
* Card satu kolom.
* Tabel berubah menjadi card list atau horizontal scroll.
* Filter menggunakan drawer.

---

## 10. Authentication

### 10.1 Login

Field:

* User ID.
* Password.
* Show password.
* Tombol Login.
* Informasi lupa password.
* Logo aplikasi.

Alur:

1. User memasukkan User ID dan password.
2. Backend memvalidasi kredensial.
3. Backend memeriksa status akun.
4. Backend memeriksa lockout.
5. Backend membuat session.
6. Session disimpan pada secure cookie.
7. User diarahkan sesuai role.

### 10.2 Password

Password wajib:

* Minimal 8 karakter.
* Disimpan dalam bentuk hash.
* Memiliki random salt.
* Tidak boleh disimpan plain text.
* Dapat dipaksa berubah saat login pertama.
* Dapat direset oleh Admin.
* Password default tidak digunakan di production.

Untuk Cloudflare Worker, gunakan Web Crypto compatible password derivation.

Gunakan:

* PBKDF2-HMAC-SHA-256.
* Random salt.
* Server-side pepper.
* Iterasi yang diuji agar sesuai CPU limit Cloudflare.

Jangan menggunakan SHA-256 tunggal untuk password.

### 10.3 Session

Gunakan opaque session token.

Ketentuan:

* Token acak.
* Hash token disimpan di database.
* Cookie HttpOnly.
* Cookie Secure.
* SameSite Strict atau Lax sesuai kebutuhan.
* Session dapat dicabut.
* Logout menghapus session.
* Reset password mencabut seluruh session.
* Session Admin lebih pendek daripada User.
* Session tidak disimpan di localStorage.

---

## 11. Role dan Permission

Gunakan Role-Based Access Control.

Role default:

* SUPERADMIN.
* ADMIN.
* USER.

Permission minimal:

* user.read.
* user.create.
* user.update.
* user.delete.
* admin.manage.
* program.read.
* program.manage.
* batch.read.
* batch.manage.
* assessment.read.
* assessment.manage.
* evaluator.read.
* evaluator.manage.
* quiz.read.
* quiz.manage.
* monitoring.read.
* report.read.
* report.export.
* attempt.reset.
* attempt.force_submit.
* settings.manage.
* audit.read.

Permission wajib diperiksa di backend.

Jangan hanya menyembunyikan menu di frontend.

---

## 12. Manajemen User

Data User:

* ID.
* User ID unik.
* NPK opsional.
* Nama lengkap.
* Password hash.
* Email.
* Nomor telepon.
* Jabatan.
* Unit kerja.
* Divisi.
* Organisasi.
* Role.
* Status.
* Must change password.
* Last login.
* Created at.
* Updated at.
* Created by.

Status:

* Active.
* Inactive.
* Locked.
* Suspended.

Fitur:

* Tambah User.
* Edit User.
* Nonaktifkan User.
* Reset password.
* Search.
* Filter.
* Pagination.
* Import.
* Export.
* Bulk assignment.
* Bulk activation.
* Bulk deactivation.

---

## 13. Import Data

Sistem harus mendukung import:

* User.
* Participant.
* Evaluator relation.
* Batch assignment.
* Soal quiz.

Format:

* XLSX.
* CSV.

Alur import:

1. Upload file.
2. Validasi file.
3. Mapping kolom.
4. Preview.
5. Validasi data.
6. Tampilkan error per baris.
7. Konfirmasi.
8. Import data valid.
9. Tampilkan ringkasan hasil.

Sediakan template download.

Template participant:

* user_id.
* npk.
* full_name.
* position.
* unit.
* division.
* organization.
* batch_code.
* email.
* phone.

Template evaluator relation:

* participant_user_id.
* evaluator_user_id.
* assessment_type_code.
* batch_code.
* target_count.

Template soal:

* question_code.
* question_text.
* question_type.
* option_a.
* option_b.
* option_c.
* option_d.
* option_e.
* correct_answer.
* weight.
* category.
* difficulty.

---

## 14. Assessment Player

User melihat daftar assessment yang ditugaskan.

Card assessment menampilkan:

* Nama assessment.
* Nama participant yang dinilai.
* Jenis assessment.
* Batch.
* Jumlah soal.
* Status.
* Progress.
* Tanggal mulai.
* Tanggal akhir.
* Tombol Mulai atau Lanjutkan.

Status:

* Upcoming.
* Not Started.
* In Progress.
* Submitted.
* Expired.
* Closed.

### 14.1 Halaman Instruksi

Tampilkan:

* Judul assessment.
* Deskripsi.
* Nama participant.
* Jenis relasi.
* Jumlah pertanyaan.
* Durasi jika ada.
* Deadline.
* Aturan pengisian.
* Pernyataan kerahasiaan.
* Checkbox persetujuan.
* Tombol Mulai.

### 14.2 Halaman Assessment

Tampilkan:

* Judul.
* Progress.
* Nomor halaman.
* Jumlah pertanyaan terjawab.
* Status autosave.
* Timer jika aktif.
* Card pertanyaan.
* Tombol Sebelumnya.
* Tombol Berikutnya.
* Tombol Submit.

---

## 15. Quiz Player

Quiz utama:

* Total soal 40.
* Total halaman 4.
* Soal per halaman 10.

Pembagian:

* Halaman 1: soal 1–10.
* Halaman 2: soal 11–20.
* Halaman 3: soal 21–30.
* Halaman 4: soal 31–40.

Konfigurasi harus dapat diubah untuk quiz lain.

Tipe soal:

* Single choice.
* Multiple choice.
* True false.
* Short text.
* Long text.

Quiz wajib mendukung:

* Autosave.
* Resume.
* Timer.
* Randomisasi soal opsional.
* Randomisasi jawaban opsional.
* Navigasi soal.
* Submit confirmation.
* Auto-submit.
* Scoring otomatis.
* Passing score.
* Result visibility setting.

---

## 16. Autosave

Autosave dilakukan:

* Saat jawaban berubah.
* Saat berpindah halaman.
* Secara berkala sebagai backup.
* Saat koneksi kembali aktif.

Ketentuan:

* Debounce 500–1000 ms.
* Endpoint idempotent.
* Simpan updated_at.
* Gunakan versioning sederhana.
* Cegah jawaban lama menimpa jawaban baru.
* Tampilkan status:

  * Menyimpan.
  * Tersimpan.
  * Gagal.
  * Menunggu koneksi.
* Simpan sementara di IndexedDB jika offline.
* Retry dengan exponential backoff.
* Gunakan timestamp server.

---

## 17. Submit

Saat User submit:

1. Validasi assignment.
2. Validasi attempt.
3. Validasi jadwal.
4. Hitung jawaban kosong.
5. Tampilkan konfirmasi.
6. Simpan jawaban terakhir.
7. Ubah status menjadi Submitted.
8. Kunci jawaban.
9. Simpan submitted_at.
10. Update dashboard progres.
11. Hitung nilai quiz jika objektif.

Jawaban tidak dapat diubah setelah submit kecuali attempt dibuka kembali oleh Admin.

---

## 18. Monitoring

Monitoring bersifat near real-time.

MVP tidak wajib menggunakan WebSocket.

Gunakan:

* Refresh dashboard setiap 15–30 detik.
* Heartbeat User setiap 30–60 detik.
* Stop heartbeat saat assessment selesai.
* Cache agregasi dashboard.
* Tombol refresh manual.

Data monitoring:

* User ID.
* Nama.
* Participant.
* Assessment type.
* Batch.
* Status.
* Progress.
* Jumlah jawaban.
* Waktu mulai.
* Aktivitas terakhir.
* Waktu submit.
* Online atau offline.
* Action.

Action:

* Lihat detail.
* Reset attempt.
* Force submit.
* Buka kembali.
* Reset password.

Action sensitif wajib meminta alasan dan dicatat di audit log.

---

## 19. Reporting

Report wajib mendukung filter:

* Program.
* Batch.
* Assessment type.
* Participant.
* Unit.
* Jabatan.
* Status.
* Persentase progres.
* Tanggal.

Report:

* Summary progress.
* Detail participant.
* Detail evaluator.
* Daftar belum submit.
* Daftar sudah submit.
* Target dibanding realisasi.
* Rekap per batch.
* Rekap per assessment type.

Ekspor:

* XLSX.
* CSV.

PDF bersifat opsional.

---

## 20. Audit Log

Audit log mencatat:

* Login berhasil.
* Login gagal.
* Logout.
* User dibuat.
* User diubah.
* User dinonaktifkan.
* Password direset.
* Program dibuat.
* Batch dibuat.
* Assessment dibuat.
* Assignment dibuat.
* Assignment diubah.
* Attempt dimulai.
* Attempt disubmit.
* Attempt direset.
* Force submit.
* Data diimpor.
* Data diekspor.
* Settings diubah.

Field:

* ID.
* Actor ID.
* Actor role.
* Action.
* Entity type.
* Entity ID.
* Previous value.
* New value.
* Reason.
* IP address.
* User agent.
* Created at.

---

## 21. Security Requirements

Wajib:

* Secure password hashing.
* Opaque session.
* HttpOnly cookie.
* Secure cookie.
* SameSite cookie.
* Session revocation.
* Backend authorization.
* RBAC.
* Scope authorization.
* Input validation.
* Output encoding.
* SQL injection protection.
* XSS protection.
* CSRF protection jika relevan.
* Rate limiting.
* Brute-force protection.
* Login lockout.
* Security headers.
* Content Security Policy.
* Audit log.
* Secret melalui environment.
* Tidak menyimpan token di repository.
* Tidak mengirim correct answer ke frontend.
* Tidak mempercayai role dari client.
* Tidak mempercayai progress dari client.
* Tidak menampilkan stack trace ke User.
* File upload validation.
* MIME validation.
* Maximum file size.

Cloudflare Turnstile dapat digunakan pada:

* Login setelah kegagalan berulang.
* Reset password.
* Aktivitas sensitif.

---

## 22. Deployment Tahap Awal: Cloudflare

Gunakan:

### Frontend

* React.
* Vite.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* TanStack Query.
* React Hook Form.
* Zod.
* Recharts.

### Backend

* Hono.
* Cloudflare Worker.
* TypeScript.
* Zod.

### Database

* Cloudflare D1.

### Storage

* Cloudflare R2 jika diperlukan.

### Security

* Cloudflare Turnstile.
* Cloudflare Rate Limiting atau rate limiter internal.
* Secure cookie.
* Worker secrets.

### Deployment

* Wrangler.
* Static assets dan API dapat menggunakan domain yang sama.
* API menggunakan prefix `/api`.
* Database tidak dapat diakses langsung dari browser.

Environment testing:

* RUNTIME=cloudflare
* DATABASE_DRIVER=d1
* STORAGE_DRIVER=r2
* RATE_LIMIT_DRIVER=cloudflare

---

## 23. Deployment Masa Depan: Docker Mini PC

Aplikasi wajib dapat dipindahkan tanpa mengubah business logic utama.

Target:

* React build yang sama.
* Hono Node.js.
* PostgreSQL.
* Redis.
* MinIO.
* Caddy.
* Cloudflare Tunnel.
* Docker Compose.

Environment production:

* RUNTIME=node
* DATABASE_DRIVER=postgres
* STORAGE_DRIVER=s3
* CACHE_DRIVER=redis
* RATE_LIMIT_DRIVER=redis

Adapter yang harus disiapkan:

* DatabaseRepository.
* ObjectStorage.
* SessionStore.
* RateLimiter.
* Scheduler.
* BackupService.

Business service tidak boleh memanggil D1 atau R2 secara langsung.

---

## 24. Architecture Requirements

Pisahkan:

* Frontend UI.
* API route.
* Application service.
* Domain logic.
* Repository interface.
* Infrastructure adapter.
* Validation.
* Authentication.
* Authorization.
* Storage.
* Logging.

Struktur yang direkomendasikan:

```text
apps/
  web/
  worker/
  server/

packages/
  core/
  api/
  database/
    interfaces/
    d1/
    postgres/
  storage/
    interfaces/
    r2/
    s3/
  auth/
  validation/
  shared/

migrations/
  sqlite/
  postgres/

docs/
  PRD.md
```

Untuk tahap Cloudflare, implementasi aktif:

* apps/web.
* apps/worker.
* packages/core.
* packages/api.
* packages/database/d1.
* packages/storage/r2.
* migrations/sqlite.

Implementasi Docker dapat disiapkan kemudian.

---

## 25. Database Entities

Minimal tabel:

* users.
* roles.
* permissions.
* role_permissions.
* user_roles.
* sessions.
* login_attempts.
* programs.
* batches.
* assessment_types.
* participants.
* evaluator_relations.
* questionnaires.
* questions.
* question_options.
* assessment_assignments.
* attempts.
* answers.
* answer_options.
* quizzes.
* quiz_questions.
* audit_logs.
* import_jobs.
* export_jobs.
* system_settings.

Tambahkan:

* UUID atau application-generated ID.
* created_at.
* updated_at.
* created_by.
* updated_by.
* status.
* soft delete jika diperlukan.
* index pada kolom pencarian utama.

Index minimal:

* users.user_id.
* users.npk.
* batches.program_id.
* evaluator_relations.participant_id.
* evaluator_relations.evaluator_id.
* attempts.assignment_id.
* attempts.status.
* answers.attempt_id.
* audit_logs.actor_id.
* audit_logs.created_at.

---

## 26. API Endpoint Plan

### Authentication

* POST /api/auth/login
* POST /api/auth/logout
* POST /api/auth/logout-all
* GET /api/auth/me
* POST /api/auth/change-password

### Users

* GET /api/users
* POST /api/users
* GET /api/users/:id
* PATCH /api/users/:id
* DELETE /api/users/:id
* POST /api/users/:id/reset-password
* POST /api/users/import
* GET /api/users/import-template

### Programs

* GET /api/programs
* POST /api/programs
* GET /api/programs/:id
* PATCH /api/programs/:id
* DELETE /api/programs/:id

### Batches

* GET /api/batches
* POST /api/batches
* GET /api/batches/:id
* PATCH /api/batches/:id
* DELETE /api/batches/:id
* POST /api/batches/:id/duplicate

### Assessment Types

* GET /api/assessment-types
* POST /api/assessment-types
* PATCH /api/assessment-types/:id

### Participants

* GET /api/participants
* POST /api/participants
* GET /api/participants/:id
* PATCH /api/participants/:id
* POST /api/participants/import

### Evaluators

* GET /api/evaluator-relations
* POST /api/evaluator-relations
* PATCH /api/evaluator-relations/:id
* DELETE /api/evaluator-relations/:id
* POST /api/evaluator-relations/import

### Assessments

* GET /api/assessments
* POST /api/assessments
* GET /api/assessments/:id
* PATCH /api/assessments/:id
* POST /api/assessments/:id/publish
* POST /api/assessments/:id/close

### User Assignments

* GET /api/my-assessments
* GET /api/my-assessments/:id
* POST /api/my-assessments/:id/start
* GET /api/attempts/:id
* PUT /api/attempts/:id/answers/:questionId
* POST /api/attempts/:id/submit
* POST /api/attempts/:id/heartbeat

### Quiz

* GET /api/quizzes
* POST /api/quizzes
* GET /api/quizzes/:id
* PATCH /api/quizzes/:id
* POST /api/quizzes/:id/publish
* POST /api/quizzes/:id/assign

### Monitoring

* GET /api/monitoring/summary
* GET /api/monitoring/progress
* GET /api/monitoring/participants
* GET /api/monitoring/participants/:id
* POST /api/attempts/:id/reset
* POST /api/attempts/:id/force-submit
* POST /api/attempts/:id/reopen

### Reports

* GET /api/reports/summary
* GET /api/reports/participants
* GET /api/reports/evaluators
* POST /api/exports
* GET /api/exports/:id
* GET /api/exports/:id/download

### Settings

* GET /api/settings
* PATCH /api/settings

### Audit

* GET /api/audit-logs

---

## 27. Performance Requirements

Target awal:

* Hingga sekitar 1.000 User pada event assessment.
* Near real-time monitoring.
* Autosave efisien.
* Tidak melakukan polling berlebihan.

Ketentuan:

* Pagination.
* Database indexing.
* Debounced autosave.
* Cache agregasi dashboard.
* Satu endpoint summary dashboard.
* Hindari N+1 query.
* Hindari query seluruh dataset setiap refresh.
* Batch database operation.
* Retry dengan jitter.
* Static asset caching.
* Gzip atau Brotli.
* Structured logging.
* Health endpoint.

Cloudflare Free harus digunakan secara hemat.

Jangan:

* Heartbeat setiap 5 detik.
* Autosave setiap ketikan tanpa debounce.
* Mengirim ulang seluruh assessment pada setiap save.
* Mengambil seluruh tabel tanpa pagination.
* Menggunakan D1 untuk file besar.
* Menyimpan log event kecil secara berlebihan.

---

## 28. Error Handling

Format error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Data tidak valid.",
  "fieldErrors": {},
  "requestId": "..."
}
```

Pesan User:

* User ID atau password tidak valid.
* Akun tidak aktif.
* Sesi telah berakhir.
* Anda tidak memiliki akses.
* Assessment belum tersedia.
* Assessment sudah ditutup.
* Jawaban berhasil disimpan.
* Jawaban belum tersinkronisasi.
* Koneksi terputus.
* File tidak sesuai format.
* Data duplikat.
* Terjadi kesalahan. Silakan coba kembali.

Jangan menampilkan stack trace.

---

## 29. Testing

### Unit Test

* Password hashing.
* Session.
* Permission.
* Scope.
* Progress calculation.
* Target and submitted calculation.
* Percentage calculation.
* Autosave.
* Submit.
* Quiz scoring.
* Batch validation.

### Integration Test

* Login.
* Create User.
* Create program.
* Create batch.
* Import participant.
* Import evaluator relation.
* Start assessment.
* Save answer.
* Resume attempt.
* Submit.
* Monitoring summary.
* Export.

### End-to-End Test

Skenario:

1. Superadmin login.
2. Superadmin membuat program.
3. Superadmin membuat batch.
4. Superadmin membuat User.
5. Superadmin mengimpor participant.
6. Superadmin mengimpor evaluator relation.
7. User login.
8. User melihat assignment.
9. User memulai assessment.
10. User mengisi.
11. User refresh.
12. Jawaban tetap ada.
13. User submit.
14. Admin melihat progres.
15. Admin membuka detail participant.
16. Admin mengekspor laporan.

Gunakan Playwright.

---

## 30. Acceptance Criteria

MVP dianggap selesai jika:

* Superadmin dapat login.
* Admin dapat login.
* User dapat login.
* Password aman.
* Session menggunakan HttpOnly cookie.
* Superadmin dapat membuat batch dinamis.
* Batch tidak di-hardcode.
* Participant dapat diimpor.
* Evaluator relation dapat diimpor.
* Self, Superior, Peer, dan Subordinate dapat dikonfigurasi.
* Target setiap assessment dapat diatur.
* Dashboard menghitung target.
* Dashboard menghitung submitted.
* Dashboard menghitung belum submit.
* Dashboard menghitung persentase.
* Filter program dan batch bekerja.
* Detail participant tersedia.
* User dapat mengisi assessment.
* Jawaban autosave.
* Jawaban tidak hilang saat refresh.
* User dapat melanjutkan attempt.
* User dapat submit.
* Admin dapat memonitor progres.
* Quiz 40 soal dibagi menjadi 4 halaman.
* Setiap halaman quiz berisi 10 soal.
* Hasil dapat diekspor.
* Audit log tersedia.
* Aplikasi dapat berjalan di Cloudflare.
* Arsitektur siap dipindahkan ke Docker.
* Lint berhasil.
* Type check berhasil.
* Test berhasil.
* Build berhasil.

---

## 31. Deliverables

* Source code.
* React frontend.
* Hono Worker backend.
* D1 schema.
* Migration.
* Seed.
* Wrangler config.
* Environment example.
* README.
* CLAUDE.md.
* PRD.
* Architecture document.
* ERD.
* API documentation.
* Import template.
* Export function.
* Unit test.
* Integration test.
* E2E test.
* Deployment guide.
* Migration guide ke Docker.

---

## 32. Implementation Phases

### Phase 1 — Architecture

* Audit repository.
* Architecture.
* Folder structure.
* ERD.
* Role permission matrix.
* API plan.
* Security plan.
* Cloudflare deployment plan.
* Docker migration plan.

### Phase 2 — Foundation

* Monorepo.
* React.
* Vite.
* TypeScript.
* Tailwind.
* shadcn/ui.
* Hono.
* D1.
* Environment.
* Lint.
* Test.

### Phase 3 — Authentication

* Login.
* Logout.
* Session.
* Password hashing.
* Role.
* Permission.
* Scope.
* Audit login.

### Phase 4 — User Management

* User CRUD.
* Admin CRUD.
* Import User.
* Reset password.
* User filters.

### Phase 5 — Program and Batch

* Program CRUD.
* Dynamic batch CRUD.
* Batch assignment.
* Batch filtering.

### Phase 6 — 360 Assessment

* Assessment type.
* Participant.
* Evaluator relation.
* Target.
* Assignment.
* Import.

### Phase 7 — Assessment Player

* Assignment list.
* Instructions.
* Start.
* Questions.
* Autosave.
* Resume.
* Submit.

### Phase 8 — Quiz

* Question bank.
* Quiz CRUD.
* 40 questions.
* 10 questions per page.
* Timer.
* Scoring.

### Phase 9 — Monitoring

* Summary cards.
* Total Progress.
* Self.
* Superior.
* Peer.
* Subordinate.
* Target.
* Submitted.
* Percentage.
* Participant detail.
* Filters.

### Phase 10 — Reporting

* Summary report.
* Participant report.
* Evaluator report.
* XLSX.
* CSV.

### Phase 11 — Security and Testing

* Rate limiting.
* Turnstile.
* Security headers.
* Unit test.
* Integration test.
* E2E test.
* Performance test.

### Phase 12 — Deployment

* D1 production migration.
* Worker deployment.
* Custom domain.
* Backup.
* Documentation.

---

## 33. Instructions for Claude Code

Sebelum coding:

1. Baca seluruh file PRD.
2. Baca CLAUDE.md.
3. Audit repository.
4. Jangan langsung membuat seluruh aplikasi.
5. Buat rencana terlebih dahulu.
6. Sebutkan asumsi.
7. Sebutkan risiko.
8. Sebutkan file yang akan dibuat.
9. Tunggu persetujuan.

Output pertama Claude wajib berisi:

1. Executive Summary.
2. Assumptions.
3. Architecture.
4. Architecture Diagram.
5. Folder Structure.
6. Database ERD.
7. Role and Permission Matrix.
8. Batch Design.
9. Evaluator Relation Design.
10. Dashboard Data Model.
11. API Plan.
12. Security Plan.
13. Cloudflare Deployment Plan.
14. Docker Migration Plan.
15. Implementation Roadmap.
16. File Change Plan.

Ketika implementasi:

* Kerjakan satu fase.
* Jangan mengerjakan seluruh fase sekaligus.
* Gunakan TypeScript strict.
* Jangan menggunakan any tanpa alasan.
* Gunakan Zod.
* Pisahkan business logic.
* Gunakan repository interface.
* Jangan memanggil D1 langsung dari UI.
* Jangan menyimpan token di localStorage.
* Jangan mengirim kunci jawaban.
* Jalankan lint.
* Jalankan type check.
* Jalankan test.
* Jalankan build.
* Perbaiki error.
* Perbarui README.
* Tampilkan file yang berubah.
* Tampilkan command yang dijalankan.

Gunakan Bahasa Indonesia untuk dokumentasi dan UI.

Gunakan Bahasa Inggris untuk:

* Nama file.
* Nama fungsi.
* Nama variabel.
* Database table.
* API endpoint.
* Type.
* Interface.
* Enum.
* Source code.
