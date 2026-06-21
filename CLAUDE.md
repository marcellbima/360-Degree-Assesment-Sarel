# Project Instructions

Project ini adalah web application assessment dan quiz untuk PT Sarel Sentra Inspira.

## Active Deployment

Deployment sementara untuk testing:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Hono
- Cloudflare Worker
- Cloudflare D1

Deployment production masa depan:

- Docker Compose
- Hono Node.js
- PostgreSQL
- Redis
- MinIO
- Caddy
- Cloudflare Tunnel

## Architecture Requirements

- Pisahkan frontend, API, business logic, dan infrastructure adapter.
- Jangan memanggil Cloudflare D1 langsung dari UI atau business service.
- Gunakan repository interface agar D1 dapat diganti PostgreSQL.
- Gunakan storage interface agar R2 dapat diganti MinIO.
- Gunakan TypeScript strict mode.
- Gunakan Zod untuk validasi.
- Authentication dan authorization wajib diperiksa di backend.
- Jangan menyimpan session token di localStorage.
- Gunakan secure HttpOnly cookie.
- Jangan mengirim kunci jawaban ke browser selama assessment berlangsung.
- Seluruh role dan scope wajib diverifikasi di server.
- Jangan melakukan perubahan besar tanpa membuat rencana terlebih dahulu.

## Workflow

Sebelum coding:

1. Baca docs/PRD.md.
2. Audit repository.
3. Buat rencana implementasi.
4. Sebutkan file yang akan dibuat atau diubah.
5. Tunggu persetujuan sebelum perubahan besar.
6. Jalankan lint, type-check, test, dan build setelah implementasi.

## Git Rules

- Jangan bekerja langsung di branch main.
- Jangan commit .env atau secret.
- Gunakan commit message yang jelas.
- Periksa git diff sebelum commit.
