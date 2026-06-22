import { useState } from 'react';
import type { AdminScopeDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';

// Editor admin scope khusus SUPERADMIN. Scope dimasukkan sebagai daftar baris
// organization/program/batch. Replace-all saat disimpan.
export function AdminScopesPage(): JSX.Element {
  const [adminId, setAdminId] = useState('');
  const [scopes, setScopes] = useState<AdminScopeDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    setInfo(null);
    try {
      const result = await adminApi.users.getScopes(adminId.trim());
      setScopes(result);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat scope.');
      setLoaded(false);
    }
  }

  function addRow(): void {
    setScopes((s) => [...s, { id: '', organizationId: null, programId: null, batchId: null }]);
  }

  function updateRow(index: number, key: keyof AdminScopeDto, value: string): void {
    setScopes((s) =>
      s.map((row, i) => (i === index ? { ...row, [key]: value.trim() === '' ? null : value.trim() } : row)),
    );
  }

  function removeRow(index: number): void {
    setScopes((s) => s.filter((_, i) => i !== index));
  }

  async function save(): Promise<void> {
    setError(null);
    setInfo(null);
    try {
      const payload = scopes.map((s) => ({
        organizationId: s.organizationId,
        programId: s.programId,
        batchId: s.batchId,
      }));
      const result = await adminApi.users.putScopes(adminId.trim(), payload);
      setScopes(result);
      setInfo('Scope tersimpan. Seluruh sesi ADMIN dicabut.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan scope.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Admin Scopes</h1>
      <div className="flex gap-2">
        <input
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
          placeholder="ID user ADMIN"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Muat Scope
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}

      {loaded ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          {scopes.length === 0 ? <p className="text-sm text-slate-400">Belum ada scope.</p> : null}
          {scopes.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={row.organizationId ?? ''}
                onChange={(e) => updateRow(i, 'organizationId', e.target.value)}
                placeholder="organizationId"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                value={row.programId ?? ''}
                onChange={(e) => updateRow(i, 'programId', e.target.value)}
                placeholder="programId"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                value={row.batchId ?? ''}
                onChange={(e) => updateRow(i, 'batchId', e.target.value)}
                placeholder="batchId"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-600 hover:underline">
                Hapus
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Tambah Baris
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Simpan (Replace All)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
