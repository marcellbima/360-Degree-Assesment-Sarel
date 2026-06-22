import { useEffect, useState, type FormEvent } from 'react';
import type { Paginated } from '@sarel/shared';
import { ApiError } from '../lib/api';
import { Modal, ConfirmDialog } from './Modal';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number';
  required?: boolean;
}
export interface ColumnDef<T> {
  header: string;
  value: (row: T) => string;
}
export interface ResourceApi<T> {
  list: (p: Record<string, string | number | undefined>) => Promise<Paginated<T>>;
  create: (body: Record<string, unknown>) => Promise<T>;
  update: (id: string, body: Record<string, unknown>) => Promise<T>;
  archive: (id: string) => Promise<T>;
  activate: (id: string) => Promise<T>;
}
export interface ResourceConfig<T> {
  title: string;
  columns: ColumnDef<T>[];
  createFields: FieldDef[];
  editFields?: FieldDef[];
  toEditValues: (row: T) => Record<string, string>;
  api: ResourceApi<T>;
  getId: (row: T) => string;
  getStatus: (row: T) => string;
  canManage: boolean;
}

const PAGE_SIZE = 20;

export function AdminResourcePage<T>({ config }: { config: ResourceConfig<T> }): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const [confirmRow, setConfirmRow] = useState<T | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    config.api
      .list({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined })
      .then((res) => active && setData(res))
      .catch((err: unknown) =>
        active ? setError(err instanceof ApiError ? err.message : 'Gagal memuat data.') : undefined,
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [config.api, page, search, status, reloadKey]);

  const reload = (): void => setReloadKey((k) => k + 1);
  const fields = formMode === 'edit' ? config.editFields ?? config.createFields : config.createFields;

  function openCreate(): void {
    setFormMode('create');
    setEditingId(null);
    setForm({});
    setFormError(null);
  }
  function openEdit(row: T): void {
    setFormMode('edit');
    setEditingId(config.getId(row));
    setForm(config.toEditValues(row));
    setFormError(null);
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    setFormBusy(true);
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.name];
      if (v !== undefined && v !== '') body[f.name] = f.type === 'number' ? Number(v) : v;
    }
    try {
      if (formMode === 'edit' && editingId) await config.api.update(editingId, body);
      else await config.api.create(body);
      setFormMode(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan.');
    } finally {
      setFormBusy(false);
    }
  }

  async function confirmArchive(): Promise<void> {
    if (!confirmRow) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await config.api.archive(config.getId(confirmRow));
      setConfirmRow(null);
      reload();
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Gagal mengarsipkan.');
    } finally {
      setConfirmBusy(false);
    }
  }

  async function activate(row: T): Promise<void> {
    try {
      await config.api.activate(config.getId(row));
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengaktifkan.');
    }
  }

  const totalPages = data ? data.totalPages : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">{config.title}</h1>
        {config.canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Tambah
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
          placeholder="Cari..."
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
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Muat ulang
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {config.columns.map((col) => (
                <th key={col.header} className="px-3 py-2 font-medium">
                  {col.header}
                </th>
              ))}
              {config.canManage ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={config.columns.length + 1}>
                  Memuat...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-3 py-4 text-red-600" colSpan={config.columns.length + 1}>
                  {error}
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={config.columns.length + 1}>
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              data?.items.map((row) => (
                <tr key={config.getId(row)} className="border-t border-slate-100">
                  {config.columns.map((col) => (
                    <td key={col.header} className="px-3 py-2">
                      {col.value(row)}
                    </td>
                  ))}
                  {config.canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-3 text-xs text-blue-600">
                        <button type="button" onClick={() => openEdit(row)} className="hover:underline">
                          Edit
                        </button>
                        {config.getStatus(row) === 'ARCHIVED' ? (
                          <button type="button" onClick={() => void activate(row)} className="hover:underline">
                            Aktifkan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmError(null);
                              setConfirmRow(row);
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Arsipkan
                          </button>
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
        <span>{data ? `${data.total} data` : ''}</span>
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

      {formMode ? (
        <Modal
          title={`${formMode === 'edit' ? 'Edit' : 'Tambah'} ${config.title}`}
          onClose={() => setFormMode(null)}
        >
          <form onSubmit={onSubmit} className="space-y-3">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-slate-600">{f.label}</label>
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  required={f.required}
                  value={form[f.name] ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formBusy}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {formBusy ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmRow ? (
        <ConfirmDialog
          title={`Arsipkan ${config.title}`}
          message="Data akan diarsipkan dan tidak menerima konfigurasi baru. Lanjutkan?"
          confirmLabel="Arsipkan"
          danger
          busy={confirmBusy}
          error={confirmError}
          onConfirm={() => void confirmArchive()}
          onCancel={() => setConfirmRow(null)}
        />
      ) : null}
    </div>
  );
}
