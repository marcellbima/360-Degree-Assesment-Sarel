import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  ProgramDto,
} from '@sarel/shared';

import {
  ApiError,
  adminApi,
} from '../../lib/api';

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
    new Date(`${value}T00:00:00`),
  );
}

export function ProgramFirstModulePage({
  title,
  description,
  workspaceDescription,
}: {
  title: string;
  description: string;
  workspaceDescription: string;
}): JSX.Element {
  const [
    programs,
    setPrograms,
  ] =
    useState<ProgramDto[]>([]);

  const [
    selectedProgramId,
    setSelectedProgramId,
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

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    adminApi.programs
      .list({
        page: 1,
        pageSize: 100,
      })
      .then((result) => {
        if (active) {
          setPrograms(result.items);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Program assessment gagal dimuat.',
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
  }, []);

  const selectedProgram =
    useMemo(
      () =>
        programs.find(
          (program) =>
            program.id ===
            selectedProgramId,
        ) ?? null,
      [
        programs,
        selectedProgramId,
      ],
    );

  if (selectedProgram) {
    return (
      <section className="space-y-5">
        <button
          type="button"
          onClick={() =>
            setSelectedProgramId('')
          }
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Kembali ke daftar Program Assessment
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-blue-600">
            {title}
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {selectedProgram.name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>
              Kode: {selectedProgram.code}
            </span>

            <span>
              Periode: {formatDate(selectedProgram.startDate)}
              {' – '}
              {formatDate(selectedProgram.endDate)}
            </span>

            <span>
              Status: {selectedProgram.status}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-800">
            Workspace {title}
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            {workspaceDescription}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Pilih Program Assessment
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {description}
        </p>
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
            Belum ada Program Assessment yang dapat diakses.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Buat program baru atau periksa scope administrator.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {programs.map(
            (program) => (
              <button
                key={program.id}
                type="button"
                onClick={() =>
                  setSelectedProgramId(
                    program.id,
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                      {program.code}
                    </p>

                    <h2 className="mt-1 font-semibold text-slate-900">
                      {program.name}
                    </h2>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {program.status}
                  </span>
                </div>

                {program.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                    {program.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>
                    Tahun: {program.year ?? '-'}
                  </span>

                  <span>
                    Mulai: {formatDate(program.startDate)}
                  </span>

                  <span>
                    Selesai: {formatDate(program.endDate)}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-blue-600">
                  Buka program →
                </p>
              </button>
            ),
          )}
        </div>
      )}
    </section>
  );
}
