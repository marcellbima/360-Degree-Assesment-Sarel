import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AdminUserDto, ParticipantDto } from '@sarel/shared';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';
import { ApiError, adminApi } from '../../lib/api';

interface ProfileForm {
  position: string;
  unit: string;
  division: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function OrganizationStructurePage({ programId }: { programId: string }): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('user.update') ?? false;

  const [participants, setParticipants] = useState<ParticipantDto[]>([]);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [target, setTarget] = useState<ParticipantDto | null>(null);
  const [form, setForm] = useState<ProfileForm>({ position: '', unit: '', division: '' });
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      adminApi.participants.list(programId, { page: 1, pageSize: 100, status: 'ACTIVE' }),
      adminApi.users.list({ page: 1, pageSize: 100, status: 'ACTIVE' }),
    ])
      .then(([participantResult, userResult]) => {
        if (!active) return;
        setParticipants(participantResult.items);
        setUsers(userResult.items);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Struktur organisasi gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [programId, reloadKey]);

  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return participants.filter((participant) => {
      if (!query) return true;
      const profile = userMap.get(participant.userId);
      return [participant.fullName, participant.userCode, profile?.division, profile?.unit, profile?.position]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('id-ID').includes(query));
    });
  }, [participants, search, userMap]);

  const groups = useMemo(() => {
    const divisionMap = new Map<string, Map<string, ParticipantDto[]>>();
    for (const participant of filtered) {
      const profile = userMap.get(participant.userId);
      const division = profile?.division?.trim() || 'Belum ada divisi';
      const unit = profile?.unit?.trim() || 'Belum ada unit';
      const unitMap = divisionMap.get(division) ?? new Map<string, ParticipantDto[]>();
      const members = unitMap.get(unit) ?? [];
      members.push(participant);
      unitMap.set(unit, members);
      divisionMap.set(division, unitMap);
    }
    return [...divisionMap.entries()].sort(([left], [right]) => left.localeCompare(right, 'id-ID'));
  }, [filtered, userMap]);

  function openEdit(participant: ParticipantDto): void {
    const profile = userMap.get(participant.userId);
    setTarget(participant);
    setForm({
      position: profile?.position ?? '',
      unit: profile?.unit ?? '',
      division: profile?.division ?? '',
    });
    setModalError(null);
  }

  async function saveProfile(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    setModalError(null);
    try {
      await adminApi.users.update(target.userId, {
        position: form.position.trim(),
        unit: form.unit.trim(),
        division: form.division.trim(),
      });
      setTarget(null);
      setMessage(`Posisi ${target.fullName} berhasil diperbarui.`);
      setReloadKey((value) => value + 1);
    } catch (caught) {
      setModalError(errorMessage(caught, 'Posisi peserta gagal disimpan.'));
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Struktur Organisasi</h1>
        <p className="mt-1 text-sm text-slate-500">Peserta otomatis dikelompokkan berdasarkan divisi dan unit.</p>
      </div>

      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari peserta, divisi, unit, atau jabatan..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memuat struktur...</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Belum ada peserta yang sesuai.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(([division, unitMap]) => {
            const divisionCount = [...unitMap.values()].reduce((total, members) => total + members.length, 0);
            return (
              <section key={division} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Divisi</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{division}</h2>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{divisionCount} peserta</span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {[...unitMap.entries()].sort(([left], [right]) => left.localeCompare(right, 'id-ID')).map(([unit, members]) => (
                    <div key={unit} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium text-slate-800">{unit}</h3>
                        <span className="text-xs text-slate-500">{members.length} orang</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {members.sort((left, right) => left.fullName.localeCompare(right.fullName, 'id-ID')).map((participant) => {
                          const profile = userMap.get(participant.userId);
                          return (
                            <button key={participant.id} type="button" disabled={!canManage} onClick={() => openEdit(participant)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left disabled:cursor-default">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{participant.fullName}</p>
                                <p className="text-xs text-slate-500">
                                  {profile?.position || 'Jabatan belum diatur'}
                                  {' • '}
                                  {participant.batchCode
                                    ? `Batch ${participant.batchCode}`
                                    : 'Tanpa Batch'}
                                </p>
                              </div>
                              {canManage ? <span className="text-xs font-medium text-blue-600">Ubah</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {target ? (
        <Modal title={`Posisi — ${target.fullName}`} onClose={() => setTarget(null)}>
          <form onSubmit={(event) => void saveProfile(event)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Divisi</label>
              <input value={form.division} onChange={(event) => setForm((current) => ({ ...current, division: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Unit</label>
              <input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Jabatan</label>
              <input value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} className={inputClass} />
            </div>
            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Batal</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
