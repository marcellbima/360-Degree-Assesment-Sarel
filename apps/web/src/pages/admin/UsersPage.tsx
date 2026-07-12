import { useEffect, useState, type FormEvent } from 'react';
import type { AdminUserDto, Paginated } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Modal, ConfirmDialog } from '../../components/Modal';

const PAGE_SIZE = 20;
const ROLE_OPTIONS = ['SUPERADMIN', 'ADMIN', 'EVALUATOR', 'USER'];

type ModalKind = 'create' | 'edit' | 'reset' | 'roles' | null;

export function UsersPage(): JSX.Element {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('user.create') ?? false;
  const canUpdate = user?.permissions.includes('user.update') ?? false;
  const canManageRoles = user?.permissions.includes('admin.manage') ?? false;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [data, setData] = useState<Paginated<AdminUserDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<ModalKind>(null);
  const [target, setTarget] = useState<AdminUserDto | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<AdminUserDto | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const reload = (): void => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminApi.users
      .list({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined, role: role || undefined })
      .then((res) => active && setData(res))
      .catch((err: unknown) =>
        active ? setError(err instanceof ApiError ? err.message : 'Gagal memuat data.') : undefined,
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, search, status, role, reloadKey]);

  function openCreate(): void {
    setTarget(null);
    setForm({ userId: '', fullName: '', password: '' });
    setSelectedRoles(['USER']);
    setModalError(null);
    setModal('create');
  }
  function openEdit(u: AdminUserDto): void {
    setTarget(u);
    setForm({
      fullName: u.fullName,
      email: u.email ?? '',
      phone: u.phone ?? '',
      position: u.position ?? '',
      unit: u.unit ?? '',
      division: u.division ?? '',
      npk: u.npk ?? '',
    });
    setModalError(null);
    setModal('edit');
  }
  function openReset(u: AdminUserDto): void {
    setTarget(u);
    setForm({ password: '' });
    setModalError(null);
    setModal('reset');
  }
  function openRoles(u: AdminUserDto): void {
    setTarget(u);
    setSelectedRoles(u.roles);
    setModalError(null);
    setModal('roles');
  }

  async function submitModal(e: FormEvent): Promise<void> {
    e.preventDefault();
    setModalError(null);
    setModalBusy(true);
    try {
      if (modal === 'create') {
        await adminApi.users.create({
          userId: form.userId,
          fullName: form.fullName,
          password: form.password,
          roles: canManageRoles ? selectedRoles : ['USER'],
        });
      } else if (modal === 'edit' && target) {
        await adminApi.users.update(target.id, {
          fullName: form.fullName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          position: form.position || undefined,
          unit: form.unit || undefined,
          division: form.division || undefined,
          npk: form.npk || undefined,
        });
      } else if (modal === 'reset' && target) {
        await adminApi.users.resetPassword(target.id, form.password);
      } else if (modal === 'roles' && target) {
        await adminApi.users.setRoles(target.id, selectedRoles);
      }
      setModal(null);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Operasi gagal.');
    } finally {
      setModalBusy(false);
    }
  }

  async function runAction(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operasi gagal.');
    }
  }

  async function confirmDeactivate(): Promise<void> {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await adminApi.users.deactivate(confirmTarget.id);
      setConfirmTarget(null);
      reload();
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Gagal menonaktifkan.');
    } finally {
      setConfirmBusy(false);
    }
  }

  function toggleRole(r: string): void {
    setSelectedRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  }

  const totalPages = data?.totalPages ?? 0;
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
        {canCreate ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Tambah User
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Cari User ID / nama..."
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Semua role</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">User ID</th>
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              {canUpdate ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Memuat...
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              data?.items.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{u.userId}</td>
                  <td className="px-3 py-2">{u.fullName}</td>
                  <td className="px-3 py-2">{u.roles.join(', ')}</td>
                  <td className="px-3 py-2">{u.status}</td>
                  {canUpdate ? (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-3 text-xs text-blue-600">
                        <button type="button" onClick={() => openEdit(u)} className="hover:underline">
                          Edit
                        </button>
                        {u.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmError(null);
                              setConfirmTarget(u);
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Nonaktifkan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void runAction(() => adminApi.users.activate(u.id))}
                            className="hover:underline"
                          >
                            Aktifkan
                          </button>
                        )}
                        <button type="button" onClick={() => openReset(u)} className="hover:underline">
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(() => adminApi.users.revokeSessions(u.id))}
                          className="hover:underline"
                        >
                          Cabut Sesi
                        </button>
                        {canManageRoles ? (
                          <button type="button" onClick={() => openRoles(u)} className="hover:underline">
                            Role
                          </button>
                        ) : null}
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
        <span>{data ? `${data.total} user` : ''}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span>
            {totalPages === 0 ? 0 : page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {modal ? (
        <Modal
          title={
            modal === 'create'
              ? 'Tambah User'
              : modal === 'edit'
                ? 'Edit User'
                : modal === 'reset'
                  ? 'Reset Password'
                  : 'Atur Role'
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={submitModal} className="space-y-3">
            {modal === 'create' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600">User ID</label>
                  <input
                    required
                    value={form.userId ?? ''}
                    onChange={(e) => setForm((s) => ({ ...s, userId: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Nama Lengkap</label>
                  <input
                    required
                    value={form.fullName ?? ''}
                    onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Password Awal</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.password ?? ''}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                {canManageRoles ? (
                  <div>
                    <span className="block text-xs font-medium text-slate-600">Role</span>
                    <div className="mt-1 flex gap-3 text-sm">
                      {ROLE_OPTIONS.map((r) => (
                        <label key={r} className="flex items-center gap-1">
                          <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />
                          {r}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {modal === 'edit' ? (
              <>
                {(['fullName', 'email', 'phone', 'position', 'unit', 'division', 'npk'] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600">{key}</label>
                    <input
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                ))}
              </>
            ) : null}

            {modal === 'reset' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">Password Baru</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.password ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Reset password mencabut seluruh sesi aktif user.
                </p>
              </div>
            ) : null}

            {modal === 'roles' ? (
              <div className="flex gap-3 text-sm">
                {ROLE_OPTIONS.map((r) => (
                  <label key={r} className="flex items-center gap-1">
                    <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />
                    {r}
                  </label>
                ))}
              </div>
            ) : null}

            {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={modalBusy}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {modalBusy ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmTarget ? (
        <ConfirmDialog
          title="Nonaktifkan User"
          message={`Nonaktifkan ${confirmTarget.userId}? Seluruh sesi aktifnya akan dicabut.`}
          confirmLabel="Nonaktifkan"
          danger
          busy={confirmBusy}
          error={confirmError}
          onConfirm={() => void confirmDeactivate()}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}
    </div>
  );
}
