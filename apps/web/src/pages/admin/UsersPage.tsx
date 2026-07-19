import { useEffect, useState, type FormEvent } from 'react';
import type { AdminUserDto, Paginated } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog, Modal } from '../../components/Modal';

const PAGE_SIZE = 50;
const DEFAULT_PASSWORD = 'Sarelian360Degre2026!';
const ROLE_OPTIONS = [
  { value: 'SUPERADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EVALUATOR', label: 'Evaluator' },
  { value: 'USER', label: 'User' },
];

type ModalKind = 'create' | 'edit' | 'reset' | 'roles' | null;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function UsersPage(): JSX.Element {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('user.create') ?? false;
  const canUpdate = user?.permissions.includes('user.update') ?? false;
  const canManageRoles = user?.permissions.includes('admin.manage') ?? false;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [role, setRole] = useState('');
  const [data, setData] = useState<Paginated<AdminUserDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<ModalKind>(null);
  const [target, setTarget] = useState<AdminUserDto | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AdminUserDto | null>(null);

  const reload = (): void => setReloadKey((value) => value + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    adminApi.users
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        role: role || undefined,
        sortBy: 'fullName',
        sortDir: 'asc',
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Daftar akun gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, search, status, role, reloadKey]);

  function openCreate(): void {
    setTarget(null);
    setForm({
      userId: '',
      fullName: '',
      division: '',
      unit: '',
      position: '',
      email: '',
      phone: '',
      npk: '',
      password: DEFAULT_PASSWORD,
    });
    setSelectedRoles(['USER']);
    setModalError(null);
    setModal('create');
  }

  function openEdit(account: AdminUserDto): void {
    setTarget(account);
    setForm({
      fullName: account.fullName,
      email: account.email ?? '',
      phone: account.phone ?? '',
      position: account.position ?? '',
      unit: account.unit ?? '',
      division: account.division ?? '',
      npk: account.npk ?? '',
    });
    setModalError(null);
    setModal('edit');
  }

  function openReset(account: AdminUserDto): void {
    setTarget(account);
    setForm({ password: DEFAULT_PASSWORD });
    setModalError(null);
    setModal('reset');
  }

  function openRoles(account: AdminUserDto): void {
    setTarget(account);
    setSelectedRoles(account.roles);
    setModalError(null);
    setModal('roles');
  }

  async function submitModal(event: FormEvent): Promise<void> {
    event.preventDefault();
    setModalError(null);
    setModalBusy(true);

    try {
      if (modal === 'create') {
        await adminApi.users.create({
          userId: form.userId.trim(),
          fullName: form.fullName.trim(),
          division: form.division?.trim() || undefined,
          unit: form.unit?.trim() || undefined,
          position: form.position?.trim() || undefined,
          email: form.email?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          npk: form.npk?.trim() || undefined,
          password: form.password,
          roles: canManageRoles ? selectedRoles : ['USER'],
        });
        setMessage(`${form.fullName.trim()} berhasil dibuat.`);
      } else if (modal === 'edit' && target) {
        await adminApi.users.update(target.id, {
          fullName: form.fullName.trim(),
          email: form.email?.trim() || undefined,
          phone: form.phone?.trim(),
          position: form.position?.trim(),
          unit: form.unit?.trim(),
          division: form.division?.trim(),
          npk: form.npk?.trim(),
        });
        setMessage(`${form.fullName.trim()} berhasil diperbarui.`);
      } else if (modal === 'reset' && target) {
        await adminApi.users.resetPassword(target.id, form.password);
        setMessage(`Password ${target.fullName} berhasil diatur ulang.`);
      } else if (modal === 'roles' && target) {
        await adminApi.users.setRoles(target.id, selectedRoles);
        setMessage(`Akses ${target.fullName} berhasil diperbarui.`);
      }

      setModal(null);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Akun gagal disimpan.'));
    } finally {
      setModalBusy(false);
    }
  }

  async function confirmDeactivate(): Promise<void> {
    if (!confirmTarget) return;
    setModalBusy(true);
    setModalError(null);
    try {
      await adminApi.users.deactivate(confirmTarget.id);
      setMessage(`${confirmTarget.fullName} berhasil dinonaktifkan.`);
      setConfirmTarget(null);
      reload();
    } catch (caught) {
      setModalError(errorMessage(caught, 'Akun gagal dinonaktifkan.'));
    } finally {
      setModalBusy(false);
    }
  }

  async function activate(account: AdminUserDto): Promise<void> {
    setError(null);
    try {
      await adminApi.users.activate(account.id);
      setMessage(`${account.fullName} berhasil diaktifkan.`);
      reload();
    } catch (caught) {
      setError(errorMessage(caught, 'Akun gagal diaktifkan.'));
    }
  }

  function toggleRole(value: string): void {
    setSelectedRoles((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Kelola Akun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan halaman ini untuk admin, reset password, dan pengaturan akses. Peserta baru lebih cepat ditambahkan melalui Kelola Peserta.
          </p>
        </div>
        {canCreate ? (
          <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Tambah Akun
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Cari nama atau User ID..." className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua akses</option>
          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="ACTIVE">Akun aktif</option>
          <option value="INACTIVE">Akun nonaktif</option>
          <option value="">Semua status</option>
        </select>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-3 font-medium">Akun</th>
              <th className="px-3 py-3 font-medium">Jabatan / Unit</th>
              <th className="px-3 py-3 font-medium">Akses</th>
              <th className="px-3 py-3 font-medium">Status</th>
              {(canUpdate || canManageRoles) ? <th className="px-3 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Memuat akun...</td></tr>
            ) : !data || data.items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Tidak ada akun yang sesuai.</td></tr>
            ) : data.items.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{account.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{account.userId}{account.email ? ` • ${account.email}` : ''}</p>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  <p>{account.position || '-'}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{[account.division, account.unit].filter(Boolean).join(' • ') || '-'}</p>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {account.roles.map((item) => <span key={item} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{ROLE_OPTIONS.find((option) => option.value === item)?.label ?? item}</span>)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${account.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {account.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                {(canUpdate || canManageRoles) ? (
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-3 text-xs font-medium text-blue-600">
                      {canUpdate ? <button type="button" onClick={() => openEdit(account)} className="hover:underline">Ubah</button> : null}
                      {canUpdate ? <button type="button" onClick={() => openReset(account)} className="hover:underline">Reset password</button> : null}
                      {canManageRoles ? <button type="button" onClick={() => openRoles(account)} className="hover:underline">Atur akses</button> : null}
                      {canUpdate && account.status === 'ACTIVE' ? (
                        <button type="button" onClick={() => setConfirmTarget(account)} className="text-red-600 hover:underline">Nonaktifkan</button>
                      ) : canUpdate ? (
                        <button type="button" onClick={() => void activate(account)} className="text-emerald-700 hover:underline">Aktifkan</button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{data?.total ?? 0} akun</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Sebelumnya</button>
          <span>{totalPages === 0 ? 0 : page} / {totalPages}</span>
          <button type="button" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">Berikutnya</button>
        </div>
      </div>

      {modal ? (
        <Modal title={modal === 'create' ? 'Tambah Akun' : modal === 'edit' ? 'Ubah Profil' : modal === 'reset' ? 'Reset Password' : 'Atur Akses'} onClose={() => setModal(null)}>
          <form onSubmit={(event) => void submitModal(event)} className="space-y-3">
            {modal === 'create' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600">User ID</label>
                  <input required autoFocus value={form.userId ?? ''} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Nama lengkap</label>
                  <input required value={form.fullName ?? ''} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Divisi
                    </label>
                    <input
                      value={form.division ?? ''}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          division: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Unit
                    </label>
                    <input
                      value={form.unit ?? ''}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          unit: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Jabatan
                  </label>
                  <input
                    value={form.position ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Kontak dan data tambahan
                  </summary>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email ?? ''}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Telepon
                      </label>
                      <input
                        value={form.phone ?? ''}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        NPK
                      </label>
                      <input
                        value={form.npk ?? ''}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            npk: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </details>

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Password awal dan akses</summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Password awal</label>
                      <input required type="text" value={form.password ?? ''} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
                    </div>
                    {canManageRoles ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ROLE_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <input type="checkbox" checked={selectedRoles.includes(option.value)} onChange={() => toggleRole(option.value)} />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              </>
            ) : null}

            {modal === 'edit' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Nama lengkap</label>
                  <input required value={form.fullName ?? ''} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Divisi</label>
                    <input value={form.division ?? ''} onChange={(event) => setForm((current) => ({ ...current, division: event.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Unit</label>
                    <input value={form.unit ?? ''} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Jabatan</label>
                  <input value={form.position ?? ''} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} className={inputClass} />
                </div>
                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Kontak dan data tambahan</summary>
                  <div className="mt-3 space-y-3">
                    <div><label className="block text-xs font-medium text-slate-600">Email</label><input type="email" value={form.email ?? ''} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} /></div>
                    <div><label className="block text-xs font-medium text-slate-600">Telepon</label><input value={form.phone ?? ''} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} /></div>
                    <div><label className="block text-xs font-medium text-slate-600">NPK</label><input value={form.npk ?? ''} onChange={(event) => setForm((current) => ({ ...current, npk: event.target.value }))} className={inputClass} /></div>
                  </div>
                </details>
              </>
            ) : null}

            {modal === 'reset' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">Password baru</label>
                <input required type="text" value={form.password ?? ''} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
              </div>
            ) : null}

            {modal === 'roles' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" checked={selectedRoles.includes(option.value)} onChange={() => toggleRole(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            ) : null}

            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Batal</button>
              <button type="submit" disabled={modalBusy || (modal === 'roles' && selectedRoles.length === 0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{modalBusy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmTarget ? (
        <ConfirmDialog
          title="Nonaktifkan Akun"
          message={`Nonaktifkan akun ${confirmTarget.fullName}? Pengguna tidak dapat login sampai akun diaktifkan kembali.`}
          confirmLabel="Nonaktifkan"
          danger
          busy={modalBusy}
          error={modalError}
          onConfirm={() => void confirmDeactivate()}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}
    </div>
  );
}
