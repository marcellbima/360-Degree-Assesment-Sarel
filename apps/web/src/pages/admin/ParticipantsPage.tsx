import { useCallback, useEffect, useState } from 'react';
import type { BatchDto, ParticipantDto, ProgramDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Modal, ConfirmDialog } from '../../components/Modal';

const PAGE_SIZE = 20;

export function ParticipantsPage(): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('participant.manage') ?? false;

  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [programId, setProgramId] = useState('');
  const [batchesList, setBatchesList] = useState<BatchDto[]>([]);
  const [batchId, setBatchId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ParticipantDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [modal, setModal] = useState<'add' | 'edit' | 'targets' | null>(null);
  const [target, setTarget] = useState<ParticipantDto | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ParticipantDto | null>(null);

  useEffect(() => {
    adminApi.programs
      .list({ pageSize: 100, status: 'ACTIVE' })
      .then((r) => {
        setPrograms(r.items);
        if (r.items[0]) setProgramId((p) => p || r.items[0].id);
      })
      .catch(() => setError('Gagal memuat program.'));
  }, []);

  useEffect(() => {
    if (!programId) return;
    adminApi.batches.list({ programId, pageSize: 100 }).then((r) => setBatchesList(r.items)).catch(() => undefined);
  }, [programId]);

  useEffect(() => {
    if (!programId) return;
    let active = true;
    setLoading(true);
    setError(null);
    adminApi.participants
      .list(programId, { page, pageSize: PAGE_SIZE, search: search || undefined, batchId: batchId || undefined, status: status || undefined })
      .then((r) => {
        if (active) {
          setData(r.items);
          setTotal(r.total);
        }
      })
      .catch((e: unknown) => active && setError(e instanceof ApiError ? e.message : 'Gagal memuat participant.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [programId, page, search, batchId, status, reloadKey]);

  function openAdd(): void {
    setForm({ userId: '', batchId: batchesList[0]?.id ?? '' });
    setModalErr(null);
    setModal('add');
  }
  function openEdit(p: ParticipantDto): void {
    setTarget(p);
    setForm({ batchId: p.batchId });
    setModalErr(null);
    setModal('edit');
  }
  async function openTargets(p: ParticipantDto): Promise<void> {
    setTarget(p);
    setModalErr(null);
    try {
      const t = await adminApi.participants.getTargets(p.id);
      setForm({
        SUPERIOR: String(t.targets.SUPERIOR),
        PEER: String(t.targets.PEER),
        SUBORDINATE: String(t.targets.SUBORDINATE),
      });
      setModal('targets');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat target.');
    }
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setModalErr(null);
    try {
      if (modal === 'add') {
        await adminApi.participants.create(programId, { userId: form.userId, batchId: form.batchId });
      } else if (modal === 'edit' && target) {
        await adminApi.participants.update(target.id, { batchId: form.batchId });
      } else if (modal === 'targets' && target) {
        await adminApi.participants.putTargets(target.id, {
          SUPERIOR: Number(form.SUPERIOR || 0),
          PEER: Number(form.PEER || 0),
          SUBORDINATE: Number(form.SUBORDINATE || 0),
        });
      }
      setModal(null);
      reload();
    } catch (e) {
      setModalErr(e instanceof ApiError ? e.message : 'Operasi gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function doArchive(): Promise<void> {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.participants.archive(confirm.id);
      setConfirm(null);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengarsipkan.');
    } finally {
      setBusy(false);
    }
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">Participants</h1>
        {canManage && programId ? (
          <button type="button" onClick={openAdd} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Tambah Participant
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={programId} onChange={(e) => { setPage(1); setProgramId(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          {programs.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select value={batchId} onChange={(e) => { setPage(1); setBatchId(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Semua batch</option>
          {batchesList.map((b) => (<option key={b.id} value={b.id}>{b.code}</option>))}
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Semua status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Cari User ID / nama..." className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">User ID</th>
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Status</th>
              {canManage ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>Tidak ada data.</td></tr>
            ) : (
              data.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{p.userCode}</td>
                  <td className="px-3 py-2">{p.fullName}</td>
                  <td className="px-3 py-2">{p.batchCode}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-3 text-xs text-blue-600">
                        <button type="button" onClick={() => openEdit(p)} className="hover:underline">Ubah Batch</button>
                        <button type="button" onClick={() => void openTargets(p)} className="hover:underline">Target</button>
                        {p.status === 'ACTIVE' ? (
                          <button type="button" onClick={() => setConfirm(p)} className="text-red-600 hover:underline">Arsipkan</button>
                        ) : (
                          <button type="button" onClick={() => void adminApi.participants.activate(p.id).then(reload)} className="hover:underline">Aktifkan</button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} participant</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Sebelumnya</button>
          <span>{totalPages === 0 ? 0 : page} / {totalPages}</span>
          <button type="button" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Berikutnya</button>
        </div>
      </div>

      {modal ? (
        <Modal title={modal === 'add' ? 'Tambah Participant' : modal === 'edit' ? 'Ubah Batch' : 'Atur Target'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {modal === 'add' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600">User ID</label>
                  <input value={form.userId ?? ''} onChange={(e) => setForm((s) => ({ ...s, userId: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Batch</label>
                  <select value={form.batchId ?? ''} onChange={(e) => setForm((s) => ({ ...s, batchId: e.target.value }))} className={inputClass}>
                    {batchesList.map((b) => (<option key={b.id} value={b.id}>{b.code}</option>))}
                  </select>
                </div>
              </>
            ) : null}
            {modal === 'edit' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">Batch</label>
                <select value={form.batchId ?? ''} onChange={(e) => setForm((s) => ({ ...s, batchId: e.target.value }))} className={inputClass}>
                  {batchesList.map((b) => (<option key={b.id} value={b.id}>{b.code}</option>))}
                </select>
              </div>
            ) : null}
            {modal === 'targets' ? (
              <>
                <p className="text-xs text-slate-500">SELF selalu 1.</p>
                {(['SUPERIOR', 'PEER', 'SUBORDINATE'] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-600">{k}</label>
                    <input type="number" min={0} value={form[k] ?? '0'} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} className={inputClass} />
                  </div>
                ))}
              </>
            ) : null}
            {modalErr ? <p className="text-sm text-red-600">{modalErr}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Batal</button>
              <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog title="Arsipkan Participant" message={`Arsipkan ${confirm.userCode}?`} confirmLabel="Arsipkan" danger busy={busy} onConfirm={() => void doArchive()} onCancel={() => setConfirm(null)} />
      ) : null}
    </div>
  );
}
