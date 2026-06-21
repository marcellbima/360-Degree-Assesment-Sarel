# Architecture Draft

## 1. Architecture Summary

Aplikasi dibangun sebagai monorepo berbasis pnpm workspaces dengan pola ports and adapters. Business logic murni dipisahkan dari infrastruktur agar deployment dapat dipindahkan dari Cloudflare ke Docker tanpa menulis ulang core.

Komposisi workspace:

- apps/web: aplikasi React (Vite, TypeScript, Tailwind, shadcn/ui). Hanya lapisan presentasi.
- apps/worker: Cloudflare composition root yang memasukkan D1 adapter dan binding Cloudflare lalu menjalankan Hono app.
- packages/core: domain, application services, authorization policy, dan ports.
- packages/api: Hono app factory, route definitions, request handlers, middleware contracts, dan error formatter.
- packages/db: Drizzle schema dan implementasi D1 untuk repository.
- packages/shared: DTO, Zod schema, constants, dan error codes.

Dependency rule:

- apps/web hanya menggunakan API dan shared contracts. apps/web tidak mengakses database secara langsung.
- apps/worker adalah Cloudflare composition root. apps/worker memasang D1 adapter dan binding Cloudflare, kemudian menjalankan Hono app dari packages/api.
- packages/api berisi Hono app factory, routes, handlers, middleware contracts, dan error formatter. packages/api memanggil application services melalui packages/core.
- packages/core berisi domain, application services, authorization policy, dan ports. packages/core hanya bergantung pada port-nya sendiri.
- packages/db berisi Drizzle schema dan D1 repository implementation yang memenuhi port pada packages/core.
- packages/shared berisi DTO, Zod schema, constants, dan error codes yang dipakai bersama oleh web, api, dan core.
- packages/core tidak boleh mengimpor D1, Drizzle, Cloudflare binding, atau packages/db. Implementasi konkret di-inject di composition root apps/worker.

Cakupan tahap ini:

- PostgreSQL, Redis, MinIO, Docker, dan apps/server belum diimplementasikan pada tahap ini.
- Hanya port dan interface yang disiapkan, sehingga adapter alternatif dapat ditambahkan kemudian tanpa mengubah core.

## 2. Dashboard Metric Definitions

Seluruh metrik dihitung dalam batas filter program dan batch, dan dibatasi oleh admin_scopes untuk role ADMIN.

Metrik utama:

- targetParticipants = jumlah program_participants aktif dalam filter program dan batch.
- completedSelfParticipants = jumlah program participant aktif yang mempunyai Self Assessment berstatus SUBMITTED.
- questionnaireCompletionPercent = completedSelfParticipants / targetParticipants * 100.

Metrik agregat submission:

- totalTargetSubmissions = jumlah target Self + Superior + Peer + Subordinate.
- Target Self = jumlah program participant aktif.
- Target Superior, Peer, dan Subordinate = jumlah participant_assessment_targets.target_count untuk tipe terkait.
- totalCompletedSubmissions = jumlah submission selesai lintas Self, Superior, Peer, dan Subordinate.
- overallSubmissionProgressPercent = totalCompletedSubmissions / totalTargetSubmissions * 100.

Aturan tambahan:

- Jika denominator bernilai 0, maka persentase harus 0 dan tidak boleh terjadi pembagian nol.
- Persentase Superior, Peer, dan Subordinate boleh melebihi 100 persen jika realisasi melebihi target.
- Assessment 360 dianggap selesai hanya ketika status SUBMITTED.
- Quiz dianggap selesai ketika status SUBMITTED, AUTO_SUBMITTED, atau GRADED.

Metrik per tipe:

- Self: target = jumlah program participant aktif; realisasi = jumlah Self Assessment submitted; persentase = realisasi / target * 100; status per participant SUBMITTED atau NOT_SUBMITTED.
- Superior: target = jumlah participant_assessment_targets.target_count tipe Superior; realisasi = jumlah assignment Superior submitted; persentase = realisasi / target * 100.
- Peer: target = jumlah participant_assessment_targets.target_count tipe Peer; realisasi = jumlah assignment Peer submitted; persentase = realisasi / target * 100.
- Subordinate: target = jumlah participant_assessment_targets.target_count tipe Subordinate; realisasi = jumlah assignment Subordinate submitted; persentase = realisasi / target * 100.

## 3. Dashboard Tabs

Dashboard memiliki lima tab:

- Total Progress
- Progress Self
- Progress Superior
- Progress Peer
- Progress Subordinate

Tab Total Progress menampilkan:

- gauge Persentase Pengisian Kuesioner
- Target Responden
- Total Responden
- card Self
- card Superior
- card Peer
- card Subordinate
- chart Target vs Realisasi
- chart Persentase per Tipe Respon
- tabel detail gabungan

Tab Progress Self menampilkan:

- Subject Assessment
- Status Self
- Submitted At

Tab Progress Superior, Progress Peer, dan Progress Subordinate masing-masing menampilkan:

- Subject Assessment
- Target
- Realisasi
- Persentase

Semua tab mendukung:

- filter program
- filter batch dinamis
- pencarian participant
- pagination
- sorting
- export

## 4. Admin Scope Rules

Aturan pembatasan akses berdasarkan role dan admin_scopes:

- SUPERADMIN dapat melihat seluruh data tanpa pembatasan scope.
- ADMIN hanya dapat melihat data yang cocok dengan admin_scopes miliknya.
- Scope dapat dibatasi berdasarkan program, batch, atau organization.
- Semua pembatasan dilakukan di backend. Frontend hanya menyembunyikan elemen, bukan menjadi sumber otorisasi.

Aturan evaluasi scope:

- Dalam satu baris admin_scopes, kondisi program_id, batch_id, dan organization_id digabung menggunakan AND. Sebuah baris hanya cocok jika seluruh kolom yang terisi pada baris itu terpenuhi.
- Beberapa baris admin_scopes milik satu Admin digabung menggunakan OR. Data terlihat jika cocok dengan minimal satu baris.
- Satu baris admin_scopes wajib memiliki minimal satu dari program_id, batch_id, atau organization_id.
- Baris dengan program_id, batch_id, dan organization_id ketiganya NULL harus ditolak pada saat validasi.
- Ketika batch_id dan program_id sama-sama diisi pada satu baris, batch tersebut harus berasal dari program tersebut. Kombinasi yang tidak konsisten harus ditolak.
- Scope dengan program saja mencakup seluruh batch dalam program tersebut.
- Scope dengan program dan batch hanya mencakup batch tersebut.
- organization_id menambahkan pembatasan organisasi pada baris scope.
- Seluruh validasi baris scope dan filtering data dilakukan di backend.
- Query import, export, report, participant, evaluator, dan monitoring wajib menerapkan scope.

## 5. Phase 2 File Change Plan

Phase 2 hanya mencakup foundation. Item yang dikerjakan:

- root workspace configuration
- apps/web skeleton
- apps/worker skeleton
- packages/core skeleton
- packages/api skeleton
- packages/db skeleton
- packages/shared skeleton
- Drizzle schema awal
- D1 migration awal
- health endpoint
- lint
- type-check
- unit-test foundation
- build foundation

Item yang tidak termasuk Phase 2:

- implementasi fitur login
- User CRUD
- assessment player
- quiz player
- dashboard lengkap
- import
- export
- Docker
