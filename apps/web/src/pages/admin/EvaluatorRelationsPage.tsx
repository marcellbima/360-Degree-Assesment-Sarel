import { useCallback, useEffect, useState } from 'react';
import type { EvaluatorRelationDto, ParticipantDto, ProgramDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Modal, ConfirmDialog } from '../../components/Modal';

const PAGE_SIZE = 20;
const TYPES = ['SUPERIOR', 'PEER', 'SUBORDINATE'];

export function EvaluatorRelationsPage(): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('evaluator.manage') ?? false;

  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [programId, setProgramId] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EvaluatorRelationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [participantOptions, setParticipantOptions] = useState<ParticipantDto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subjectParticipantId: '', evaluatorParticipantId: '', assessmentType: 'PEER' });
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<EvaluatorRelationDto | null>(null);

  useEffect(() => {
    adminApi.programs.list({ pageSize: 100, status: 'ACTIVE' }).then((r) => {
      setPrograms(r.items);
      if (r.items[0]) setProgramId((p) => p || r.items[0].id);
    }).catch(() => setError('Gagal memuat program.'));
  }, []);

  useEffect(() => {
    if (!programId) return;
    let active = true;
    setLoading(true);
    setError(null);
    adminApi.relations
      .list(programId, { page, pageSize: PAGE_SIZE, search: search || undefined, assessmentType: assessmentType || undefined, status: status || undefined })
      .then((r) => { if (active) { setData(r.items); setTotal(r.total); } })
      .catch((e: unknown) => active && setError(e instanceof ApiError ? e.message : 'Gagal memuat relation.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [programId, page, search, assessmentType, status, reloadKey]);

  async function openCreate(): Promise<void> {
    setModalErr(null);
    setForm({ subjectParticipantId: '', evaluatorParticipantId: '', assessmentType: 'PEER' });
    try {
      const r = await adminApi.participants.list(programId, { pageSize: 100, status: 'ACTIVE' });
      setParticipantOptions(r.items);
      setShowCreate(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat participant.');
    }
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setModalErr(null);
    try {
      await adminApi.relations.create(programId, form);
      setShowCreate(false);
      reload();
    } catch (e) {
      setModalErr(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }

  async function doArchive(): Promise<void> {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.relations.archive(confirm.id);
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
        <h1 className="text-xl font-semibold text-slate-800">Evaluator Relations</h1>
        {canManage && programId ? (
          <button type="button" onClick={() => void openCreate()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Tambah Relation</button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={programId} onChange={(e) => { setPage(1); setProgramId(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          {programs.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select value={assessmentType} onChange={(e) => { setPage(1); setAssessmentType(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Semua tipe</option>
          {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Semua status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Cari subject / evaluator..." className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Subject</th>
              <th className="px-3 py-2 font-medium">Evaluator</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
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
              data.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.subjectUserCode} — {r.subjectName}</td>
                  <td className="px-3 py-2">{r.evaluatorUserCode} — {r.evaluatorName}</td>
                  <td className="px-3 py-2">{r.assessmentType}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-3 text-xs text-blue-600">
                        {r.status === 'ACTIVE' ? (
                          <button type="button" onClick={() => setConfirm(r)} className="text-red-600 hover:underline">Arsipkan</button>
                        ) : (
                          <button type="button" onClick={() => void adminApi.relations.activate(r.id).then(reload)} className="hover:underline">Aktifkan</button>
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
        <span>{total} relation</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Sebelumnya</button>
          <span>{totalPages === 0 ? 0 : page} / {totalPages}</span>
          <button type="button" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Berikutnya</button>
        </div>
      </div>

      {showCreate ? (
        <Modal title="Tambah Evaluator Relation" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Subject</label>
              <select value={form.subjectParticipantId} onChange={(e) => setForm((s) => ({ ...s, subjectParticipantId: e.target.value }))} className={inputClass}>
                <option value="">Pilih...</option>
                {participantOptions.map((p) => (<option key={p.id} value={p.id}>{p.userCode} — {p.fullName} ({p.batchCode})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Evaluator</label>
              <select value={form.evaluatorParticipantId} onChange={(e) => setForm((s) => ({ ...s, evaluatorParticipantId: e.target.value }))} className={inputClass}>
                <option value="">Pilih...</option>
                {participantOptions.map((p) => (<option key={p.id} value={p.id}>{p.userCode} — {p.fullName} ({p.batchCode})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Tipe</label>
              <select value={form.assessmentType} onChange={(e) => setForm((s) => ({ ...s, assessmentType: e.target.value }))} className={inputClass}>
                {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            {modalErr ? <p className="text-sm text-red-600">{modalErr}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Batal</button>
              <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog title="Arsipkan Relation" message="Arsipkan relation ini?" confirmLabel="Arsipkan" danger busy={busy} onConfirm={() => void doArchive()} onCancel={() => setConfirm(null)} />
      ) : null}
    </div>
  );
}
