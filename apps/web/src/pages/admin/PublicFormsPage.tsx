import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ApiError } from '../../lib/api';
import {
  publicFormAdminApi,
  type PublicFormRecord,
} from '../../lib/public-form-api';
import { FormBuilderPage } from './FormBuilderPage';

type PageMode =
  | 'list'
  | 'create'
  | 'edit';

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

export function PublicFormsPage(): JSX.Element {
  const [mode, setMode] =
    useState<PageMode>('list');

  const [selectedForm, setSelectedForm] =
    useState<PublicFormRecord | null>(
      null,
    );

  const [items, setItems] =
    useState<PublicFormRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadForms =
    useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await publicFormAdminApi.list({
            page: 1,
            pageSize: 50,
          });

        setItems(result.items);
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Daftar formulir gagal dimuat.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  async function deleteForm(
    form: PublicFormRecord,
  ): Promise<void> {
    const title =
      form.title
        .replace(/<[^>]*>/g, '')
        .trim() ||
      'Tanpa judul';

    const confirmed =
      window.confirm(
        `Hapus form "${title}"?\n\nSeluruh respons yang tersimpan untuk form ini juga akan dihapus. Google Sheet yang sudah dibuat tidak ikut dihapus.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(form.id);
    setError(null);

    try {
      await publicFormAdminApi.remove(
        form.id,
      );

      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== form.id,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Formulir gagal dihapus.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  function returnToList(): void {
    setMode('list');
    setSelectedForm(null);
    void loadForms();
  }

  if (mode !== 'list') {
    const existing =
      mode === 'edit'
        ? selectedForm ?? undefined
        : undefined;

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={returnToList}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Kembali ke daftar formulir
        </button>

        <FormBuilderPage
          key={existing?.id ?? 'new-form'}
          initialRecord={existing}
          onSaved={(saved) => {
            setSelectedForm(saved);
            setMode('edit');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Form Builder
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Buat, pratinjau, dan terbitkan form assessment dari satu tempat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedForm(null);
            setMode('create');
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Buat Form
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Memuat daftar formulir...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              Belum ada formulir.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Buat formulir baru untuk mulai mengumpulkan respons.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Judul
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Slug
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Terakhir diperbarui
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((form) => (
                  <tr
                    key={form.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {form.title}
                      </p>

                      {form.description ? (
                        <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                          {form.description}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {form.slug}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          form.status ===
                          'PUBLISHED'
                            ? 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700'
                            : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700'
                        }
                      >
                        {form.status ===
                        'PUBLISHED'
                          ? 'Terbit'
                          : 'Draft'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(
                        form.updatedAt,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            form.id
                          }
                          onClick={() => {
                            setSelectedForm(form);
                            setMode('edit');
                          }}
                          className="text-sm font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Buka
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId !==
                            null
                          }
                          onClick={() =>
                            void deleteForm(
                              form,
                            )
                          }
                          className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId ===
                          form.id
                            ? 'Menghapus...'
                            : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
