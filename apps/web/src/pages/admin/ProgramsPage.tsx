import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type {
  OrganizationDto,
  ProgramDto,
} from '@sarel/shared';

import {
  useAuth,
} from '../../auth/AuthContext';
import {
  ConfirmDialog,
  Modal,
} from '../../components/Modal';
import {
  ApiError,
  adminApi,
} from '../../lib/api';

const PAGE_SIZE = 12;

type ProgramTab =
  | 'summary'
  | 'settings'
  | 'participants'
  | 'assignments'
  | 'monitoring'
  | 'results';

interface ProgramFormState {
  code: string;
  name: string;
  description: string;
  organizationId: string;
  year: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: ProgramFormState = {
  code: '',
  name: '',
  description: '',
  organizationId: '',
  year: '',
  startDate: '',
  endDate: '',
};

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'medium',
    },
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  );
}

function statusClass(
  status: string,
): string {
  return status === 'ACTIVE'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-200 text-slate-600';
}

function errorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof ApiError
    ? error.message
    : fallback;
}

function programCode(name: string, year: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return [base || 'PROGRAM', year.trim()].filter(Boolean).join('_').slice(0, 60);
}

export function ProgramsPage({
  onOpenParticipants,
}: {
  onOpenParticipants?: (programId: string) => void;
}): JSX.Element {
  const { user } = useAuth();

  const canManage =
    user?.permissions.includes(
      'program.manage',
    ) ?? false;

  const [
    programs,
    setPrograms,
  ] =
    useState<ProgramDto[]>([]);

  const [
    organizations,
    setOrganizations,
  ] =
    useState<OrganizationDto[]>([]);

  const [
    selectedProgram,
    setSelectedProgram,
  ] =
    useState<ProgramDto | null>(
      null,
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ProgramTab>(
      'summary',
    );

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    status,
    setStatus,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    reloadKey,
    setReloadKey,
  ] =
    useState(0);

  const [
    formMode,
    setFormMode,
  ] =
    useState<
      'create' | 'edit' | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<ProgramFormState>(
      EMPTY_FORM,
    );

  const [
    formError,
    setFormError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    formBusy,
    setFormBusy,
  ] =
    useState(false);

  const [
    confirmArchive,
    setConfirmArchive,
  ] =
    useState(false);

  const organizationMap =
    useMemo(
      () =>
        new Map(
          organizations.map(
            (organization) => [
              organization.id,
              organization,
            ],
          ),
        ),
      [organizations],
    );

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total / PAGE_SIZE,
        );

  const reload =
    useCallback(() => {
      setReloadKey(
        (current) =>
          current + 1,
      );
    }, []);

  useEffect(() => {
    let active = true;

    adminApi.organizations
      .list({
        page: 1,
        pageSize: 100,
      })
      .then((result) => {
        if (active) {
          setOrganizations(
            result.items,
          );
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Daftar client/organisasi gagal dimuat.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    adminApi.programs
      .list({
        page,
        pageSize: PAGE_SIZE,
        search:
          search || undefined,
        status:
          status || undefined,
      })
      .then((result) => {
        if (active) {
          setPrograms(
            result.items,
          );
          setTotal(
            result.total,
          );
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            errorMessage(
              caught,
              'Program Assessment gagal dimuat.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    page,
    reloadKey,
    search,
    status,
  ]);

  async function openProgram(
    id: string,
  ): Promise<void> {
    setError(null);

    try {
      const result =
        await adminApi
          .programs
          .get(id);

      setSelectedProgram(
        result,
      );
      setActiveTab(
        'summary',
      );
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          'Detail Program Assessment gagal dimuat.',
        ),
      );
    }
  }

  function openCreate():
    void {
    setForm({
      ...EMPTY_FORM,
      organizationId: organizations[0]?.id ?? '',
      year: String(new Date().getFullYear()),
    });
    setFormError(null);
    setFormMode('create');
  }

  function openEdit():
    void {
    if (!selectedProgram) {
      return;
    }

    setForm({
      code:
        selectedProgram.code,
      name:
        selectedProgram.name,
      description:
        selectedProgram
          .description ?? '',
      organizationId:
        selectedProgram
          .organizationId ?? '',
      year:
        selectedProgram.year != null
          ? String(
              selectedProgram.year,
            )
          : '',
      startDate:
        selectedProgram
          .startDate ?? '',
      endDate:
        selectedProgram
          .endDate ?? '',
    });

    setFormError(null);
    setFormMode('edit');
  }

  async function submitProgram(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();

    setFormBusy(true);
    setFormError(null);

    const body: Record<
      string,
      unknown
    > = {
      code: form.code.trim() || programCode(form.name, form.year),
      name: form.name.trim(),
      description:
        form.description.trim(),
      organizationId:
        form.organizationId,
    };

    if (form.year) {
      body.year =
        Number(form.year);
    }

    if (form.startDate) {
      body.startDate =
        form.startDate;
    }

    if (form.endDate) {
      body.endDate =
        form.endDate;
    }

    try {
      if (
        formMode === 'edit' &&
        selectedProgram
      ) {
        const updated =
          await adminApi
            .programs
            .update(
              selectedProgram.id,
              body,
            );

        setSelectedProgram(
          updated,
        );
      } else {
        const created = await adminApi
          .programs
          .create(body);

        if (onOpenParticipants) {
          setFormMode(null);
          onOpenParticipants(created.id);
          return;
        }
      }

      setFormMode(null);
      reload();
    } catch (caught) {
      setFormError(
        errorMessage(
          caught,
          'Program Assessment gagal disimpan.',
        ),
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function archiveProgram():
    Promise<void> {
    if (!selectedProgram) {
      return;
    }

    setFormBusy(true);
    setFormError(null);

    try {
      const updated =
        await adminApi
          .programs
          .archive(
            selectedProgram.id,
          );

      setSelectedProgram(
        updated,
      );
      setConfirmArchive(false);
      reload();
    } catch (caught) {
      setFormError(
        errorMessage(
          caught,
          'Program Assessment gagal diarsipkan.',
        ),
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function activateProgram():
    Promise<void> {
    if (!selectedProgram) {
      return;
    }

    setFormBusy(true);
    setError(null);

    try {
      const updated =
        await adminApi
          .programs
          .activate(
            selectedProgram.id,
          );

      setSelectedProgram(
        updated,
      );
      reload();
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          'Program Assessment gagal diaktifkan.',
        ),
      );
    } finally {
      setFormBusy(false);
    }
  }

  if (selectedProgram) {
    const organization =
      selectedProgram
        .organizationId
        ? organizationMap.get(
            selectedProgram
              .organizationId,
          )
        : undefined;

    const tabs: {
      key: ProgramTab;
      label: string;
    }[] = [
      {
        key: 'summary',
        label: 'Ringkasan',
      },
      {
        key: 'settings',
        label: 'Pengaturan Program',
      },
      {
        key: 'participants',
        label: 'Peserta & Batch',
      },
      {
        key: 'assignments',
        label: 'Penugasan',
      },
      {
        key: 'monitoring',
        label: 'Monitoring',
      },
      {
        key: 'results',
        label: 'Hasil & Laporan',
      },
    ];

    return (
      <section className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setSelectedProgram(
              null,
            );
            setActiveTab(
              'summary',
            );
          }}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Kembali ke daftar Program Assessment
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                {selectedProgram.code}
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {selectedProgram.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {organization
                  ? `${organization.code} — ${organization.name}`
                  : 'Organisasi belum ditentukan'}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                selectedProgram.status,
              )}`}
            >
              {selectedProgram.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>
              Tahun:{' '}
              {selectedProgram.year ??
                '-'}
            </span>

            <span>
              Mulai:{' '}
              {formatDate(
                selectedProgram.startDate,
              )}
            </span>

            <span>
              Selesai:{' '}
              {formatDate(
                selectedProgram.endDate,
              )}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.key,
                  )
                }
                className={`border-b-2 px-4 py-3 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab ===
        'summary' ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Peserta
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  —
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Kelola seluruh peserta melalui workspace program.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Penugasan
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  —
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Penugasan akan tampil setelah layanannya tersedia.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Progres
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  —
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Progres akan tampil setelah layanan monitoring tersedia.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-800">
                Tentang Program
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {selectedProgram.description ||
                  'Belum ada deskripsi program.'}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab ===
        'settings' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Pengaturan Program
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kelola identitas client, periode project, dan status Program Assessment.
                </p>
              </div>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Edit Program
                  </button>

                  {selectedProgram.status ===
                  'ARCHIVED' ? (
                    <button
                      type="button"
                      disabled={formBusy}
                      onClick={() =>
                        void activateProgram()
                      }
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Aktifkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmArchive(
                          true,
                        )
                      }
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Arsipkan
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">
                  Kode Program
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {selectedProgram.code}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Organisasi
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {organization?.name ??
                    '-'}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Tanggal Mulai
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatDate(
                    selectedProgram.startDate,
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Tanggal Selesai
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatDate(
                    selectedProgram.endDate,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {activeTab ===
        'participants' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-800">Peserta & Batch</h2>
            <p className="mt-2 text-sm text-slate-500">Kelola peserta, Batch, struktur organisasi, relasi penilai, dan import dalam satu workspace.</p>
            {onOpenParticipants ? (
              <button
                type="button"
                onClick={() => onOpenParticipants(selectedProgram.id)}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Buka Kelola Peserta
              </button>
            ) : null}
          </div>
        ) : null}

        {activeTab ===
        'assignments' ? (
          <ProgramWorkspacePlaceholder
            title="Penugasan"
            description="Pilih form, peserta atau Batch, jenis penilaian, dan periode dalam satu alur."
          />
        ) : null}

        {activeTab ===
        'monitoring' ? (
          <ProgramWorkspacePlaceholder
            title="Monitoring"
            description="Lihat peserta yang belum mulai, sedang mengisi, sudah selesai, dan terlambat."
          />
        ) : null}

        {activeTab ===
        'results' ? (
          <ProgramWorkspacePlaceholder
            title="Hasil & Laporan"
            description="Lihat ringkasan hasil terlebih dahulu, lalu buka detail dan unduh laporan saat diperlukan."
          />
        ) : null}

        {formMode ? (
          <ProgramFormModal
            mode={formMode}
            form={form}
            organizations={
              organizations
            }
            busy={formBusy}
            error={formError}
            onChange={setForm}
            onSubmit={
              submitProgram
            }
            onClose={() =>
              setFormMode(null)
            }
          />
        ) : null}

        {confirmArchive ? (
          <ConfirmDialog
            title="Arsipkan Program Assessment"
            message={`Arsipkan program "${selectedProgram.name}"? Data peserta dan hasil tidak dihapus, tetapi program tidak menerima konfigurasi baru.`}
            confirmLabel="Arsipkan"
            danger
            busy={formBusy}
            error={formError}
            onConfirm={() =>
              void archiveProgram()
            }
            onCancel={() =>
              setConfirmArchive(
                false,
              )
            }
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Program Assessment
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Program Assessment
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Satu program menyatukan peserta, Batch, penugasan, monitoring, dan laporan dalam satu periode.
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buat Program Assessment
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(
              event.target.value,
            );
          }}
          placeholder="Cari nama program..."
          className="min-w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(
              event.target.value,
            );
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">
            Semua status
          </option>
          <option value="ACTIVE">
            ACTIVE
          </option>
          <option value="ARCHIVED">
            ARCHIVED
          </option>
        </select>

        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Muat ulang
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Memuat Program Assessment...
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">
            Belum ada Program Assessment.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Buat program untuk mulai mengatur assessment.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {programs.map(
            (program) => {
              const organization =
                program.organizationId
                  ? organizationMap.get(
                      program.organizationId,
                    )
                  : undefined;

              return (
                <article
                  key={program.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                        {program.code}
                      </p>

                      <h2 className="mt-1 text-lg font-semibold text-slate-900">
                        {program.name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {organization
                          ? organization.name
                          : 'Organisasi belum ditentukan'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                        program.status,
                      )}`}
                    >
                      {program.status}
                    </span>
                  </div>

                  {program.description ? (
                    <p className="mt-4 line-clamp-2 text-sm text-slate-600">
                      {program.description}
                    </p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p>
                        Tanggal Mulai
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(
                          program.startDate,
                        )}
                      </p>
                    </div>

                    <div>
                      <p>
                        Tanggal Selesai
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(
                          program.endDate,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {onOpenParticipants ? (
                      <button
                        type="button"
                        onClick={() => onOpenParticipants(program.id)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Kelola Peserta
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void openProgram(program.id)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Lihat Detail
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} program
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage(
                (current) =>
                  Math.max(
                    1,
                    current - 1,
                  ),
              )
            }
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Sebelumnya
          </button>

          <span>
            {totalPages === 0
              ? 0
              : page}
            {' / '}
            {totalPages}
          </span>

          <button
            type="button"
            disabled={
              totalPages === 0 ||
              page >= totalPages
            }
            onClick={() =>
              setPage(
                (current) =>
                  current + 1,
              )
            }
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {formMode ? (
        <ProgramFormModal
          mode={formMode}
          form={form}
          organizations={
            organizations
          }
          busy={formBusy}
          error={formError}
          onChange={setForm}
          onSubmit={submitProgram}
          onClose={() =>
            setFormMode(null)
          }
        />
      ) : null}
    </section>
  );
}

function ProgramWorkspacePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="font-semibold text-slate-800">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ProgramFormModal({
  mode,
  form,
  organizations,
  busy,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit';
  form: ProgramFormState;
  organizations: OrganizationDto[];
  busy: boolean;
  error: string | null;
  onChange: (value: ProgramFormState) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <Modal title={mode === 'create' ? 'Buat Program Assessment' : 'Ubah Program Assessment'} onClose={onClose}>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Nama Program</label>
          <input
            required
            autoFocus
            value={form.name}
            onChange={(event) => onChange({
              ...form,
              name: event.target.value,
            })}
            placeholder="Sarel - 360 Degree Assesment"
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Tahun</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={form.year}
              onChange={(event) => onChange({ ...form, year: event.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Kode Program</label>
            <input
              value={form.code}
              onChange={(event) => onChange({ ...form, code: event.target.value })}
              placeholder="Dibuat otomatis"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Tanggal Mulai</label>
            <input type="date" value={form.startDate} onChange={(event) => onChange({ ...form, startDate: event.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Tanggal Selesai</label>
            <input type="date" value={form.endDate} onChange={(event) => onChange({ ...form, endDate: event.target.value })} className={inputClass} />
          </div>
        </div>

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Pengaturan tambahan</summary>
          <div className="mt-3 space-y-3">
            {organizations.length > 1 ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">Organisasi</label>
                <select required value={form.organizationId} onChange={(event) => onChange({ ...form, organizationId: event.target.value })} className={inputClass}>
                  <option value="">Pilih organisasi...</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </div>
            ) : organizations[0] ? (
              <p className="text-sm text-slate-500">Organisasi: <strong className="text-slate-700">{organizations[0].name}</strong></p>
            ) : null}
            <div>
              <label className="block text-xs font-medium text-slate-600">Deskripsi</label>
              <textarea rows={3} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} className={inputClass} />
            </div>
          </div>
        </details>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Batal</button>
          <button type="submit" disabled={busy || !form.organizationId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Menyimpan...' : 'Simpan Program'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
