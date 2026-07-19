import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BatchDto, ParticipantDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';

const PAGE_SIZE = 100;
const DEFAULT_PASSWORD = 'Sarelian360Degre2026!';
const NO_BATCH_FILTER = '__NO_BATCH__';

type ModalKind = 'add' | 'targets' | null;

interface AddForm {
  userId: string;
  fullName: string;
  batchId: string;
  password: string;
}

interface TargetForm {
  SUPERIOR: string;
  PEER: string;
  SUBORDINATE: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function statusLabel(status: string): string {
  return status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan';
}

export function ParticipantsPage({
  programId,
  initialBatchId = '',
}: {
  programId: string;
  initialBatchId?: string;
}): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('participant.manage') ?? false;
  const canCreateUser = user?.permissions.includes('user.create') ?? false;

  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [status, setStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [participants, setParticipants] = useState<ParticipantDto[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<ParticipantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const [modal, setModal] = useState<ModalKind>(null);
  const [target, setTarget] = useState<ParticipantDto | null>(null);
  const [addForm, setAddForm] = useState<AddForm>({
    userId: '',
    fullName: '',
    batchId: '',
    password: DEFAULT_PASSWORD,
  });
  const [targetForm, setTargetForm] = useState<TargetForm>({
    SUPERIOR: '0',
    PEER: '0',
    SUBORDINATE: '0',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  useEffect(() => {
    setBatchId(initialBatchId);
  }, [initialBatchId]);

  useEffect(() => {
    if (!programId) return;
    let active = true;

    adminApi.batches
      .list({ programId, page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((result) => {
        if (!active) return;
        const ordered = [...result.items].sort((left, right) => left.orderIndex - right.orderIndex);
        setBatches(ordered);
        setBulkBatchId((current) => current || ordered[0]?.id || '');
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Batch gagal dimuat.'));
      });

    return () => {
      active = false;
    };
  }, [programId, reloadKey]);

  useEffect(() => {
    if (!programId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      adminApi.participants.list(programId, {
        page: 1,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        batchId:
          batchId &&
          batchId !== NO_BATCH_FILTER
            ? batchId
            : undefined,
        withoutBatch:
          batchId === NO_BATCH_FILTER
            ? true
            : undefined,
        status: status || undefined,
        sortBy: 'userCode',
        sortDir: 'asc',
      }),
      adminApi.participants.list(programId, {
        page: 1,
        pageSize: PAGE_SIZE,
        status: 'ACTIVE',
        sortBy: 'userCode',
        sortDir: 'asc',
      }),
    ])
      .then(([filtered, allActive]) => {
        if (!active) return;
        setParticipants(filtered.items);
        setActiveParticipants(allActive.items);
        setSelectedIds(new Set());
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Data peserta gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [programId, search, batchId, status, reloadKey]);

  const batchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const participant of activeParticipants) {
      if (!participant.batchId) continue;
      counts.set(participant.batchId, (counts.get(participant.batchId) ?? 0) + 1);
    }
    return counts;
  }, [activeParticipants]);
  const withoutBatchCount =
    useMemo(
      () =>
        activeParticipants.filter(
          (participant) =>
            participant.batchId === null,
        ).length,
      [activeParticipants],
    );


  const allVisibleSelected =
    participants.length > 0 && participants.every((participant) => selectedIds.has(participant.id));

  function toggleAllVisible(checked: boolean): void {
    setSelectedIds(checked ? new Set(participants.map((participant) => participant.id)) : new Set());
  }

  function toggleParticipant(id: string, checked: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function openAdd(): void {
    setAddForm({
      userId: '',
      fullName: '',
      batchId: '',
      password: DEFAULT_PASSWORD,
    });
    setModalError(null);
    setModal('add');
  }

  async function openTargets(participant: ParticipantDto): Promise<void> {
    setTarget(participant);
    setModalError(null);
    try {
      const result = await adminApi.participants.getTargets(participant.id);
      setTargetForm({
        SUPERIOR: String(result.targets.SUPERIOR),
        PEER: String(result.targets.PEER),
        SUBORDINATE: String(result.targets.SUBORDINATE),
      });
      setModal('targets');
    } catch (caught) {
      setError(errorMessage(caught, 'Target penilai gagal dimuat.'));
    }
  }

  async function addParticipant(event: FormEvent): Promise<void> {
    event.preventDefault();
    setModalBusy(true);
    setModalError(null);

    const userId = addForm.userId.trim();
    const fullName = addForm.fullName.trim();
    const selectedBatchId =
      addForm.batchId || null;

    try {
      const userResult = await adminApi.users.list({
        page: 1,
        pageSize: 100,
        search: userId,
      });
      let existingUser = userResult.items.find(
        (item) => item.userId.toLocaleLowerCase('id-ID') === userId.toLocaleLowerCase('id-ID'),
      );

      if (!existingUser) {
        if (!canCreateUser) {
          throw new ApiError(403, 'Akun belum ada dan Anda tidak memiliki akses untuk membuat akun.');
        }
        existingUser = await adminApi.users.create({
          userId,
          fullName,
          password: addForm.password,
          roles: ['USER'],
        });
      } else {
        if (existingUser.status !== 'ACTIVE') {
          existingUser = await adminApi.users.activate(existingUser.id);
        }
        if (fullName && existingUser.fullName !== fullName) {
          existingUser = await adminApi.users.update(existingUser.id, { fullName });
        }
      }

      const enrollmentResult = await adminApi.participants.list(programId, {
        page: 1,
        pageSize: 100,
        search: userId,
      });
      const existingParticipant = enrollmentResult.items.find(
        (item) => item.userCode.toLocaleLowerCase('id-ID') === userId.toLocaleLowerCase('id-ID'),
      );

      if (existingParticipant) {
        if (
          existingParticipant.batchId !==
          selectedBatchId
        ) {
          await adminApi.participants.update(
            existingParticipant.id,
            {
              batchId:
                selectedBatchId,
            },
          );
        }
        if (existingParticipant.status !== 'ACTIVE') {
          await adminApi.participants.activate(existingParticipant.id);
        }
      } else {
        await adminApi.participants.create(programId, {
          userId: existingUser.userId,
          batchId: addForm.batchId,
        });
      }

      setModal(null);
      setMessage(`${fullName || userId} berhasil ditambahkan sebagai peserta.`);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Peserta gagal ditambahkan.'));
    } finally {
      setModalBusy(false);
    }
  }

  async function saveTargets(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!target) return;
    setModalBusy(true);
    setModalError(null);
    try {
      await adminApi.participants.putTargets(target.id, {
        SUPERIOR: Number(targetForm.SUPERIOR || 0),
        PEER: Number(targetForm.PEER || 0),
        SUBORDINATE: Number(targetForm.SUBORDINATE || 0),
      });
      setModal(null);
      setMessage(`Target penilai ${target.fullName} berhasil disimpan.`);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Target penilai gagal disimpan.'));
    } finally {
      setModalBusy(false);
    }
  }

  async function changeBatch(participant: ParticipantDto, nextBatchId: string): Promise<void> {
    const normalizedBatchId = nextBatchId || null;
    if (normalizedBatchId === participant.batchId) return;
    setError(null);
    setMessage(null);
    try {
      await adminApi.participants.update(participant.id, { batchId: normalizedBatchId });
      reload();
    } catch (caught) {
      setError(errorMessage(caught, 'Batch peserta gagal diubah.'));
    }
  }

  async function runBulk(action: 'move' | 'archive' | 'activate'): Promise<void> {
    const selected = participants.filter((participant) => selectedIds.has(participant.id));
    if (selected.length === 0) return;

    setBulkBusy(true);
    setError(null);
    setMessage(null);

    const results = await Promise.allSettled(
      selected.map((participant) => {
        if (action === 'move') return adminApi.participants.update(participant.id, { batchId: bulkBatchId || null });
        if (action === 'archive') return adminApi.participants.archive(participant.id);
        return adminApi.participants.activate(participant.id);
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    const succeeded = results.length - failed.length;

    if (failed.length > 0) {
      const first = failed[0];
      setError(
        first?.status === 'rejected'
          ? `${failed.length} peserta gagal diproses. ${errorMessage(first.reason, '')}`.trim()
          : `${failed.length} peserta gagal diproses.`,
      );
    }
    if (succeeded > 0) setMessage(`${succeeded} peserta berhasil diproses.`);

    setBulkBusy(false);
    reload();
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Data Peserta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tambah akun dan peserta sekaligus, lalu kelola Batch langsung dari tabel.
          </p>
        </div>
        {canManage ? (
          <button type="button" onClick={openAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Tambah Peserta
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => setBatchId('')} className={`rounded-xl border p-4 text-left ${batchId === '' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <p className="text-xs text-slate-500">Semua Batch</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{activeParticipants.length}</p>
        </button>
        {batches.map((batch) => (
          <button key={batch.id} type="button" onClick={() => setBatchId(batch.id)} className={`rounded-xl border p-4 text-left ${batchId === batch.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-xs text-slate-500">Batch {batch.code}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{batchCounts.get(batch.id) ?? 0}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setBatchId(
              NO_BATCH_FILTER,
            )
          }
          className={`rounded-xl border p-4 text-left ${
            batchId === NO_BATCH_FILTER
              ? 'border-blue-300 bg-blue-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs text-slate-500">
            Tanpa Batch
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {withoutBatchCount}
          </p>
        </button>

      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau User ID..." className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="ACTIVE">Peserta aktif</option>
          <option value="ARCHIVED">Peserta diarsipkan</option>
          <option value="">Semua status</option>
        </select>
      </div>

      {selectedIds.size > 0 && canManage ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <span className="mr-auto text-sm font-medium text-blue-800">{selectedIds.size} peserta dipilih</span>
          <select value={bulkBatchId} onChange={(event) => setBulkBatchId(event.target.value)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm">
            <option value="">Tanpa Batch</option>
                      {batches.map((batch) => <option key={batch.id} value={batch.id}>Batch {batch.code}</option>)}
          </select>
          <button type="button" disabled={bulkBusy} onClick={() => void runBulk('move')} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Pindahkan Batch</button>
          {status === 'ARCHIVED' ? (
            <button type="button" disabled={bulkBusy} onClick={() => void runBulk('activate')} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-50">Aktifkan</button>
          ) : (
            <button type="button" disabled={bulkBusy} onClick={() => void runBulk('archive')} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Arsipkan</button>
          )}
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {canManage ? <th className="w-12 px-3 py-3 text-center"><input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} /></th> : null}
              <th className="px-3 py-3 font-medium">Peserta</th>
              <th className="min-w-40 px-3 py-3 font-medium">Batch</th>
              <th className="px-3 py-3 font-medium">Status</th>
              {canManage ? <th className="px-3 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={canManage ? 5 : 3}>Memuat peserta...</td></tr>
            ) : participants.length === 0 ? (
              <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={canManage ? 5 : 3}>Tidak ada peserta yang sesuai.</td></tr>
            ) : participants.map((participant) => (
              <tr key={participant.id} className="border-t border-slate-100">
                {canManage ? <td className="px-3 py-3 text-center"><input type="checkbox" checked={selectedIds.has(participant.id)} onChange={(event) => toggleParticipant(participant.id, event.target.checked)} /></td> : null}
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{participant.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{participant.userCode}</p>
                </td>
                <td className="px-3 py-3">
                  {canManage && participant.status === 'ACTIVE' ? (
                    <select value={participant.batchId ?? ''} onChange={(event) => void changeBatch(participant, event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                      <option value="">Tanpa Batch</option>
                      {batches.map((batch) => <option key={batch.id} value={batch.id}>Batch {batch.code}</option>)}
                    </select>
                  ) : participant.batchCode ? `Batch ${participant.batchCode}` : 'Tanpa Batch'}
                </td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${participant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{statusLabel(participant.status)}</span></td>
                {canManage ? (
                  <td className="px-3 py-3 text-right">
                    <button type="button" onClick={() => void openTargets(participant)} className="text-xs font-medium text-blue-600 hover:underline">Atur target penilai</button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">{participants.length} peserta ditampilkan.</p>

      {modal === 'add' ? (
        <Modal title="Tambah Peserta" onClose={() => setModal(null)}>
          <form onSubmit={(event) => void addParticipant(event)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">User ID</label>
              <input required autoFocus value={addForm.userId} onChange={(event) => setAddForm((current) => ({ ...current, userId: event.target.value }))} placeholder="SRL031" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Nama lengkap</label>
              <input required value={addForm.fullName} onChange={(event) => setAddForm((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Batch</label>
              <select value={addForm.batchId} onChange={(event) => setAddForm((current) => ({ ...current, batchId: event.target.value }))} className={inputClass}>
                <option value="">Tanpa Batch</option>
                {batches.map((batch) => <option key={batch.id} value={batch.id}>Batch {batch.code}</option>)}
              </select>
            </div>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Password awal</summary>
              <input required type="text" value={addForm.password} onChange={(event) => setAddForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
              <p className="mt-1 text-xs text-slate-500">Digunakan hanya ketika akun belum pernah dibuat.</p>
            </details>
            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Batal</button>
              <button type="submit" disabled={modalBusy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{modalBusy ? 'Menyimpan...' : 'Tambah Peserta'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'targets' && target ? (
        <Modal title={`Target Penilai — ${target.fullName}`} onClose={() => setModal(null)}>
          <form onSubmit={(event) => void saveTargets(event)} className="space-y-3">
            <p className="text-sm text-slate-500">Penilaian diri sendiri selalu dibuat satu kali. Tentukan kebutuhan penilai lainnya.</p>
            {([
              ['SUPERIOR', 'Atasan'],
              ['PEER', 'Rekan kerja'],
              ['SUBORDINATE', 'Bawahan'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <input type="number" min={0} value={targetForm[key]} onChange={(event) => setTargetForm((current) => ({ ...current, [key]: event.target.value }))} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            ))}
            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Batal</button>
              <button type="submit" disabled={modalBusy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{modalBusy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
