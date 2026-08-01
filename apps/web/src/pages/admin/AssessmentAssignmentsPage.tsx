import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProgramDto } from '@sarel/shared';

import { ApiError, adminApi } from '../../lib/api';
import {
  assessmentAssignmentAdminApi,
  type AssessmentAssignmentFormVersion,
  type AssessmentAssignmentGroup,
  type AssessmentAssignmentSelection,
  type AssessmentAssignmentType,
} from '../../lib/assessment-assignment-api';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function formatProgramDate(value: string | null): string {
  if (!value) {
    return 'Belum ditentukan';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Tidak dibatasi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function assessmentTypeLabel(type: AssessmentAssignmentType): string {
  const labels: Record<AssessmentAssignmentType, string> = {
    SELF: 'Diri Sendiri',
    SUPERIOR: 'Atasan',
    PEER: 'Rekan Kerja',
    SUBORDINATE: 'Bawahan',
  };

  return labels[type];
}

function selectionLabel(selection: AssessmentAssignmentSelection): string {
  if (selection.mode === 'ALL_ACTIVE') {
    return 'Semua peserta aktif';
  }

  if (selection.mode === 'PARTICIPANTS') {
    return `${selection.participantIds.length} peserta dipilih`;
  }

  const batchCount = selection.batchIds.length;

  if (selection.includeWithoutBatch) {
    return batchCount > 0 ? `${batchCount} Batch dan peserta tanpa Batch` : 'Peserta tanpa Batch';
  }

  return `${batchCount} Batch`;
}

export function AssessmentAssignmentsPage({
  initialProgramId = '',
  onProgramChange,
}: {
  initialProgramId?: string;
  onProgramChange?: (programId: string) => void;
}): JSX.Element {
  const [programs, setPrograms] = useState<ProgramDto[]>([]);

  const [selectedProgramId, setSelectedProgramId] = useState('');

  const [participantCount, setParticipantCount] = useState(0);

  const [relationCount, setRelationCount] = useState(0);

  const [formVersions, setFormVersions] = useState<AssessmentAssignmentFormVersion[]>([]);

  const [assignmentGroups, setAssignmentGroups] = useState<AssessmentAssignmentGroup[]>([]);

  const [loadingPrograms, setLoadingPrograms] = useState(true);

  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    setLoadingPrograms(true);
    setError(null);

    adminApi.programs
      .list({
        page: 1,
        pageSize: 100,
        status: 'ACTIVE',
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setPrograms(result.items);

        const requested = result.items.find((program) => program.id === initialProgramId);

        const nextProgramId =
          requested?.id ?? (result.items.length === 1 ? (result.items[0]?.id ?? '') : '');

        setSelectedProgramId(nextProgramId);

        if (nextProgramId) {
          onProgramChange?.(nextProgramId);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(errorMessage(caught, 'Program Assessment gagal dimuat.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPrograms(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialProgramId, onProgramChange]);

  useEffect(() => {
    if (!selectedProgramId) {
      setParticipantCount(0);
      setRelationCount(0);
      setFormVersions([]);
      setAssignmentGroups([]);
      return;
    }

    let active = true;

    setLoadingWorkspace(true);
    setError(null);

    Promise.all([
      adminApi.participants.list(selectedProgramId, {
        page: 1,
        pageSize: 1,
        status: 'ACTIVE',
      }),
      adminApi.relations.list(selectedProgramId, {
        page: 1,
        pageSize: 1,
        status: 'ACTIVE',
      }),
      assessmentAssignmentAdminApi.listFormVersions({
        page: 1,
        pageSize: 100,
      }),
      assessmentAssignmentAdminApi.listGroups(selectedProgramId, {
        page: 1,
        pageSize: 100,
      }),
    ])
      .then(([participants, relations, versions, groups]) => {
        if (!active) {
          return;
        }

        setParticipantCount(participants.total);

        setRelationCount(relations.total);

        setFormVersions(versions.items);

        setAssignmentGroups(groups.items);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(errorMessage(caught, 'Data Penugasan Assessment gagal dimuat.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingWorkspace(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedProgramId, reloadKey]);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const totalAssignments = useMemo(
    () => assignmentGroups.reduce((total, group) => total + group.createdAssignmentCount, 0),
    [assignmentGroups],
  );

  function selectProgram(programId: string): void {
    setSelectedProgramId(programId);

    onProgramChange?.(programId);
  }

  if (!selectedProgram) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium text-blue-600">Penugasan Assessment</p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Pilih Program Assessment</h1>

          <p className="mt-2 text-sm text-slate-500">
            Pilih program terlebih dahulu untuk melihat dan membuat penugasan.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loadingPrograms ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Memuat Program Assessment...
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">Belum ada program aktif.</p>

            <p className="mt-1 text-sm text-slate-500">
              Buat dan aktifkan Program Assessment terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {programs.map((program) => (
              <button
                key={program.id}
                type="button"
                onClick={() => selectProgram(program.id)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  {program.code}
                </p>

                <h2 className="mt-1 font-semibold text-slate-900">{program.name}</h2>

                <p className="mt-4 text-sm font-medium text-blue-600">Buka penugasan →</p>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Penugasan Assessment</p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{selectedProgram.name}</h1>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>Kode: {selectedProgram.code}</span>

              <span>
                Periode: {formatProgramDate(selectedProgram.startDate)} –{' '}
                {formatProgramDate(selectedProgram.endDate)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {programs.length > 1 ? (
              <div>
                <label className="block text-xs font-medium text-slate-500">Ganti program</label>

                <select
                  value={selectedProgramId}
                  onChange={(event) => selectProgram(event.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <button
              type="button"
              onClick={reload}
              disabled={loadingWorkspace}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Muat ulang
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Peserta aktif</p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {loadingWorkspace ? '—' : participantCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Relasi penilai</p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {loadingWorkspace ? '—' : relationCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Versi form tersedia</p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {loadingWorkspace ? '—' : formVersions.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total penugasan</p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {loadingWorkspace ? '—' : totalAssignments}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!loadingWorkspace && formVersions.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Belum ada versi form yang dapat digunakan. Terbitkan form melalui Form Builder terlebih
          dahulu.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-800">Daftar Penugasan</h2>

            <p className="mt-1 text-sm text-slate-500">
              Seluruh penugasan yang telah dibuat untuk program ini.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {assignmentGroups.length} grup
          </span>
        </div>

        {loadingWorkspace ? (
          <div className="p-6 text-sm text-slate-500">Memuat daftar penugasan...</div>
        ) : assignmentGroups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">Belum ada penugasan.</p>

            <p className="mt-1 text-sm text-slate-500">
              Penugasan pertama akan tampil di bagian ini setelah dibuat.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {assignmentGroups.map((group) => (
              <article key={group.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{group.name}</h3>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {assessmentTypeLabel(group.assessmentType)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {group.formTitle} · Versi {group.versionNumber}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">{selectionLabel(group.selection)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-semibold text-slate-900">
                      {group.createdAssignmentCount}
                    </p>

                    <p className="text-xs text-slate-500">penugasan dibuat</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Peserta terpilih</p>

                    <p className="mt-1 font-medium text-slate-800">
                      {group.selectedParticipantCount}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Duplikat dilewati</p>

                    <p className="mt-1 font-medium text-slate-800">{group.skippedDuplicateCount}</p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Tanpa relasi</p>

                    <p className="mt-1 font-medium text-slate-800">
                      {group.skippedNoRelationCount}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Batas waktu</p>

                    <p className="mt-1 font-medium text-slate-800">{formatDateTime(group.dueAt)}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Dibuat {formatDateTime(group.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
