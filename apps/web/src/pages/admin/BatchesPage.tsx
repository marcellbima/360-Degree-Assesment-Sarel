import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BatchDto, ParticipantDto } from '@sarel/shared';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { ApiError, adminApi } from '../../lib/api';

interface BatchForm {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

const EMPTY_FORM: BatchForm = {
  code: '',
  name: '',
  startDate: '',
  endDate: '',
  description: '',
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function codeFromName(name: string, fallback: string): string {
  const batchMatch = name.trim().match(/^batch\s+(.+)$/i);
  const source = batchMatch?.[1] || name || fallback;
  return source
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function formatDate(value: string | null): string {
  if (!value) return 'Belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

export function BatchesPage({
  programId,
  onViewParticipants,
}: {
  programId: string;
  onViewParticipants?: (batchId: string) => void;
}): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('batch.manage') ?? false;

  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [participants, setParticipants] = useState<ParticipantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [target, setTarget] = useState<BatchDto | null>(null);
  const [form, setForm] = useState<BatchForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<BatchDto | null>(null);

  useEffect(() => {
    if (!programId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      adminApi.batches.list({ programId, page: 1, pageSize: 100 }),
      adminApi.participants.list(programId, { page: 1, pageSize: 100, status: 'ACTIVE' }),
    ])
      .then(([batchResult, participantResult]) => {
        if (!active) return;
        setBatches([...batchResult.items].sort((left, right) => left.orderIndex - right.orderIndex));
        setParticipants(participantResult.items);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Data Batch gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [programId, reloadKey]);

  const participantCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const participant of participants) {
      if (!participant.batchId) continue;
      counts.set(participant.batchId, (counts.get(participant.batchId) ?? 0) + 1);
    }
    return counts;
  }, [participants]);

  function openCreate(): void {
    const nextNumber = batches.length + 1;
    setTarget(null);
    setForm({
      ...EMPTY_FORM,
      name: `Batch ${String.fromCharCode(64 + Math.min(nextNumber, 26))}`,
    });
    setModalError(null);
    setModal('create');
  }

  function openEdit(batch: BatchDto): void {
    setTarget(batch);
    setForm({
      code: batch.code,
      name: batch.name,
      startDate: batch.startDate ?? '',
      endDate: batch.endDate ?? '',
      description: batch.description ?? '',
    });
    setModalError(null);
    setModal('edit');
  }

  async function saveBatch(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setModalError(null);

    try {
      const code = codeFromName(form.name, `BATCH_${batches.length + 1}`);
      const body = {
        code: form.code.trim() || code,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };

      if (modal === 'edit' && target) {
        await adminApi.batches.update(target.id, body);
        setMessage(`${form.name.trim()} berhasil diperbarui.`);
      } else {
        await adminApi.batches.create({
          ...body,
          programId,
          orderIndex: batches.length + 1,
        });
        setMessage(`${form.name.trim()} berhasil dibuat.`);
      }

      setModal(null);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Batch gagal disimpan.'));
    } finally {
      setBusy(false);
    }
  }

  async function archiveBatch(): Promise<void> {
    if (!confirmArchive) return;
    setBusy(true);
    setModalError(null);
    try {
      await adminApi.batches.archive(confirmArchive.id);
      setMessage(`${confirmArchive.name} berhasil diarsipkan.`);
      setConfirmArchive(null);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Batch gagal diarsipkan.'));
    } finally {
      setBusy(false);
    }
  }

  async function activateBatch(batch: BatchDto): Promise<void> {
    setError(null);
    try {
      await adminApi.batches.activate(batch.id);
      setMessage(`${batch.name} berhasil diaktifkan.`);
      reload();
    } catch (caught) {
      setError(errorMessage(caught, 'Batch gagal diaktifkan.'));
    }
  }

  async function moveBatch(batch: BatchDto, direction: -1 | 1): Promise<void> {
    const currentIndex = batches.findIndex((item) => item.id === batch.id);
    const other = batches[currentIndex + direction];
    if (!other) return;

    setError(null);
    try {
      await Promise.all([
        adminApi.batches.update(batch.id, { orderIndex: other.orderIndex }),
        adminApi.batches.update(other.id, { orderIndex: batch.orderIndex }),
      ]);
      reload();
    } catch (caught) {
      setError(errorMessage(caught, 'Urutan Batch gagal diubah.'));
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Batch</h1>
          <p className="mt-1 text-sm text-slate-500">Lihat jumlah peserta, ubah nama, dan buka peserta dalam satu klik.</p>
        </div>
        {canManage ? (
          <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Tambah Batch
          </button>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memuat Batch...</div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">Belum ada Batch.</p>
          <p className="mt-1 text-sm text-slate-500">Tambahkan Batch pertama untuk mulai menempatkan peserta.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch, index) => {
            const count = participantCounts.get(batch.id) ?? 0;
            return (
              <article key={batch.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Batch {batch.code}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{batch.name}</h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${batch.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {batch.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan'}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3 rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Peserta aktif</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{count}</p>
                  </div>
                  {onViewParticipants ? (
                    <button type="button" onClick={() => onViewParticipants(batch.id)} className="text-sm font-medium text-blue-600 hover:underline">Lihat peserta →</button>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div><p>Mulai</p><p className="mt-1 font-medium text-slate-700">{formatDate(batch.startDate)}</p></div>
                  <div><p>Selesai</p><p className="mt-1 font-medium text-slate-700">{formatDate(batch.endDate)}</p></div>
                </div>

                {canManage ? (
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={() => openEdit(batch)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Ubah</button>
                    <button type="button" disabled={index === 0} onClick={() => void moveBatch(batch, -1)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 disabled:opacity-40" aria-label="Naikkan urutan">↑</button>
                    <button type="button" disabled={index === batches.length - 1} onClick={() => void moveBatch(batch, 1)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 disabled:opacity-40" aria-label="Turunkan urutan">↓</button>
                    {batch.status === 'ACTIVE' ? (
                      <button type="button" disabled={count > 0} title={count > 0 ? 'Pindahkan peserta terlebih dahulu.' : undefined} onClick={() => setConfirmArchive(batch)} className="ml-auto text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Arsipkan</button>
                    ) : (
                      <button type="button" onClick={() => void activateBatch(batch)} className="ml-auto text-sm font-medium text-emerald-700">Aktifkan</button>
                    )}
                  </div>
                ) : null}

                {count > 0 && batch.status === 'ACTIVE' ? <p className="mt-2 text-xs text-slate-400">Batch dapat diarsipkan setelah seluruh peserta dipindahkan.</p> : null}
              </article>
            );
          })}
        </div>
      )}

      {modal ? (
        <Modal title={modal === 'create' ? 'Tambah Batch' : 'Ubah Batch'} onClose={() => setModal(null)}>
          <form onSubmit={(event) => void saveBatch(event)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Nama Batch</label>
              <input required autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Batch A" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">Tanggal mulai</label>
                <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Tanggal selesai</label>
                <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className={inputClass} />
              </div>
            </div>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Pengaturan tambahan</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Kode Batch</label>
                  <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="Dibuat otomatis dari nama" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Deskripsi</label>
                  <textarea rows={2} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
                </div>
              </div>
            </details>
            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Batal</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmArchive ? (
        <ConfirmDialog
          title="Arsipkan Batch"
          message={`Arsipkan ${confirmArchive.name}?`}
          confirmLabel="Arsipkan"
          danger
          busy={busy}
          error={modalError}
          onConfirm={() => void archiveBatch()}
          onCancel={() => setConfirmArchive(null)}
        />
      ) : null}
    </div>
  );
}
