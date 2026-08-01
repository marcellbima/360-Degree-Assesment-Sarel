import { useMemo, useState, type FormEvent } from 'react';
import type { BatchDto, ParticipantDto } from '@sarel/shared';

import { useAuth } from '../../auth/AuthContext';
import { ApiError, adminApi } from '../../lib/api';
import {
  assessmentAssignmentAdminApi,
  type AssessmentAssignmentFormVersion,
  type AssessmentAssignmentSelection,
  type AssessmentAssignmentType,
  type CreateAssessmentAssignmentResult,
} from '../../lib/assessment-assignment-api';

type SelectionMode = AssessmentAssignmentSelection['mode'];

interface AssignmentForm {
  name: string;
  publicFormVersionId: string;
  assessmentType: AssessmentAssignmentType;
  selectionMode: SelectionMode;
  availableFrom: string;
  dueAt: string;
}

const TYPE_OPTIONS: {
  value: AssessmentAssignmentType;
  label: string;
  description: string;
}[] = [
  {
    value: 'SELF',
    label: 'Diri Sendiri',
    description: 'Setiap peserta menilai dirinya sendiri.',
  },
  {
    value: 'SUPERIOR',
    label: 'Atasan',
    description: 'Penilaian menggunakan relasi Atasan.',
  },
  {
    value: 'PEER',
    label: 'Rekan Kerja',
    description: 'Penilaian menggunakan relasi Rekan Kerja.',
  },
  {
    value: 'SUBORDINATE',
    label: 'Bawahan',
    description: 'Penilaian menggunakan relasi Bawahan.',
  },
];

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function toIsoDateTime(value: string, label: string): string | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} tidak valid.`);
  }

  return date.toISOString();
}

async function loadAllBatches(programId: string): Promise<BatchDto[]> {
  const items: BatchDto[] = [];
  let page = 1;

  while (true) {
    const result = await adminApi.batches.list({
      programId,
      page,
      pageSize: 100,
      status: 'ACTIVE',
    });

    items.push(...result.items);

    if (items.length >= result.total || result.items.length === 0) {
      return items.sort((left, right) => left.orderIndex - right.orderIndex);
    }

    page += 1;
  }
}

async function loadAllParticipants(programId: string): Promise<ParticipantDto[]> {
  const items: ParticipantDto[] = [];

  let page = 1;

  while (true) {
    const result = await adminApi.participants.list(programId, {
      page,
      pageSize: 100,
      status: 'ACTIVE',
    });

    items.push(...result.items);

    if (items.length >= result.total || result.items.length === 0) {
      return items.sort((left, right) => left.fullName.localeCompare(right.fullName, 'id-ID'));
    }

    page += 1;
  }
}

export function AssessmentAssignmentCreatePanel({
  programId,
  programName,
  formVersions,
  participantCount,
  relationCount,
  onCreated,
}: {
  programId: string;
  programName: string;
  formVersions: AssessmentAssignmentFormVersion[];
  participantCount: number;
  relationCount: number;
  onCreated: (result: CreateAssessmentAssignmentResult) => void;
}): JSX.Element | null {
  const { user } = useAuth();

  const isSuperAdmin = user?.roles.includes('SUPERADMIN') ?? false;

  const canManage = isSuperAdmin || (user?.permissions.includes('assessment.manage') ?? false);

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<AssignmentForm>({
    name: '',
    publicFormVersionId: '',
    assessmentType: 'SELF',
    selectionMode: 'ALL_ACTIVE',
    availableFrom: '',
    dueAt: '',
  });

  const [batches, setBatches] = useState<BatchDto[]>([]);

  const [participants, setParticipants] = useState<ParticipantDto[]>([]);

  const [loadedProgramId, setLoadedProgramId] = useState('');

  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  const [includeWithoutBatch, setIncludeWithoutBatch] = useState(false);

  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());

  const [participantSearch, setParticipantSearch] = useState('');

  const [resourceLoading, setResourceLoading] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const visibleParticipants = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase('id-ID');

    if (!query) {
      return participants;
    }

    return participants.filter((participant) =>
      [participant.fullName, participant.userCode, participant.batchCode]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('id-ID').includes(query)),
    );
  }, [participantSearch, participants]);

  const noBatchCount = useMemo(
    () => participants.filter((participant) => !participant.batchId).length,
    [participants],
  );

  const isOtherAssessment = form.assessmentType !== 'SELF';

  const selectionValid =
    form.selectionMode === 'ALL_ACTIVE' ||
    (form.selectionMode === 'BATCHES' && (selectedBatchIds.size > 0 || includeWithoutBatch)) ||
    (form.selectionMode === 'PARTICIPANTS' && selectedParticipantIds.size > 0);

  const canSubmit =
    form.name.trim().length > 0 &&
    Boolean(form.publicFormVersionId) &&
    participantCount > 0 &&
    selectionValid &&
    !resourceLoading &&
    !busy &&
    !(isOtherAssessment && relationCount === 0);

  if (!canManage) {
    return null;
  }

  async function openForm(): Promise<void> {
    setOpen(true);
    setError(null);
    setMessage(null);

    setForm({
      name: `Penugasan Assessment - ${programName}`,
      publicFormVersionId: formVersions[0]?.id ?? '',
      assessmentType: 'SELF',
      selectionMode: 'ALL_ACTIVE',
      availableFrom: '',
      dueAt: '',
    });

    setSelectedBatchIds(new Set());

    setIncludeWithoutBatch(false);

    setSelectedParticipantIds(new Set());

    setParticipantSearch('');

    if (loadedProgramId === programId) {
      return;
    }

    setResourceLoading(true);

    try {
      const [nextBatches, nextParticipants] = await Promise.all([
        loadAllBatches(programId),
        loadAllParticipants(programId),
      ]);

      setBatches(nextBatches);
      setParticipants(nextParticipants);
      setLoadedProgramId(programId);
    } catch (caught) {
      setError(errorMessage(caught, 'Batch dan peserta gagal dimuat.'));
    } finally {
      setResourceLoading(false);
    }
  }

  function toggleBatch(batchId: string): void {
    setSelectedBatchIds((current) => {
      const next = new Set(current);

      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }

      return next;
    });
  }

  function toggleParticipant(participantId: string): void {
    setSelectedParticipantIds((current) => {
      const next = new Set(current);

      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }

      return next;
    });
  }

  function selectVisibleParticipants(): void {
    setSelectedParticipantIds(
      (current) =>
        new Set([...current, ...visibleParticipants.map((participant) => participant.id)]),
    );
  }

  function clearVisibleParticipants(): void {
    const visibleIds = new Set(visibleParticipants.map((participant) => participant.id));

    setSelectedParticipantIds(
      (current) => new Set([...current].filter((id) => !visibleIds.has(id))),
    );
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const availableFrom = toIsoDateTime(form.availableFrom, 'Waktu mulai');

      const dueAt = toIsoDateTime(form.dueAt, 'Batas waktu');

      if (availableFrom && dueAt && Date.parse(dueAt) <= Date.parse(availableFrom)) {
        throw new Error('Batas waktu harus setelah waktu mulai.');
      }

      let selection: AssessmentAssignmentSelection;

      if (form.selectionMode === 'BATCHES') {
        selection = {
          mode: 'BATCHES',
          batchIds: [...selectedBatchIds],
          includeWithoutBatch,
        };
      } else if (form.selectionMode === 'PARTICIPANTS') {
        selection = {
          mode: 'PARTICIPANTS',
          participantIds: [...selectedParticipantIds],
        };
      } else {
        selection = {
          mode: 'ALL_ACTIVE',
        };
      }

      const result = await assessmentAssignmentAdminApi.create(programId, {
        name: form.name.trim(),
        publicFormVersionId: form.publicFormVersionId,
        assessmentType: form.assessmentType,
        selection,
        availableFrom,
        dueAt,
      });

      const notes: string[] = [`${result.createdAssignmentCount} penugasan berhasil dibuat.`];

      if (result.skippedDuplicateCount > 0) {
        notes.push(`${result.skippedDuplicateCount} duplikat dilewati.`);
      }

      if (result.skippedNoRelationCount > 0) {
        notes.push(`${result.skippedNoRelationCount} peserta tidak memiliki relasi yang sesuai.`);
      }

      setMessage(notes.join(' '));

      setOpen(false);
      onCreated(result);
    } catch (caught) {
      setError(errorMessage(caught, 'Penugasan gagal dibuat.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold text-slate-800">Buat Penugasan</h2>

          <p className="mt-1 text-sm text-slate-500">
            Pilih form, jenis penilaian, target, dan periode pengerjaan.
          </p>
        </div>

        {!open ? (
          <button
            type="button"
            onClick={() => void openForm()}
            disabled={formVersions.length === 0 || participantCount === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buat Penugasan
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="mx-5 mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {open ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="space-y-5 border-t border-slate-200 p-5"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Nama penugasan</label>

              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Form</label>

              <select
                required
                value={form.publicFormVersionId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    publicFormVersionId: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {formVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.formTitle} — Versi {version.versionNumber} ({version.questionCount}{' '}
                    pertanyaan)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Jenis penilaian</label>

            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 ${
                    form.assessmentType === option.value
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="assessmentType"
                    value={option.value}
                    checked={form.assessmentType === option.value}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        assessmentType: option.value,
                      }))
                    }
                    className="mr-2"
                  />

                  <span className="text-sm font-medium text-slate-800">{option.label}</span>

                  <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                </label>
              ))}
            </div>
          </div>

          {isOtherAssessment ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                relationCount > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {relationCount > 0
                ? `Sistem akan menggunakan relasi aktif yang sesuai dengan jenis penilaian. Saat ini tersedia ${relationCount} relasi aktif.`
                : 'Belum ada relasi penilai aktif. Atur Relasi Penilai sebelum membuat penugasan selain Diri Sendiri.'}
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-slate-600">Target peserta</label>

            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['ALL_ACTIVE', 'Semua peserta aktif'],
                ['BATCHES', 'Pilih Batch'],
                ['PARTICIPANTS', 'Pilih peserta'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      selectionMode: value as SelectionMode,
                    }))
                  }
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.selectionMode === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {resourceLoading ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Memuat Batch dan peserta...
            </div>
          ) : null}

          {!resourceLoading && form.selectionMode === 'BATCHES' ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {batches.map((batch) => (
                  <label
                    key={batch.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBatchIds.has(batch.id)}
                      onChange={() => toggleBatch(batch.id)}
                    />

                    {batch.name}
                  </label>
                ))}

                {noBatchCount > 0 ? (
                  <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeWithoutBatch}
                      onChange={(event) => setIncludeWithoutBatch(event.target.checked)}
                    />
                    Tanpa Batch ({noBatchCount})
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {!resourceLoading && form.selectionMode === 'PARTICIPANTS' ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                <input
                  value={participantSearch}
                  onChange={(event) => setParticipantSearch(event.target.value)}
                  placeholder="Cari nama, User ID, atau Batch"
                  className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={selectVisibleParticipants}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
                >
                  Pilih yang tampil
                </button>

                <button
                  type="button"
                  onClick={clearVisibleParticipants}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
                >
                  Hapus pilihan
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {selectedParticipantIds.size} peserta dipilih
              </p>

              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
                {visibleParticipants.map((participant) => (
                  <label
                    key={participant.id}
                    className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.has(participant.id)}
                      onChange={() => toggleParticipant(participant.id)}
                    />

                    <span>
                      <span className="block font-medium text-slate-800">
                        {participant.fullName}
                      </span>

                      <span className="text-xs text-slate-500">
                        {participant.userCode} · {participant.batchCode ?? 'Tanpa Batch'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Mulai tersedia (opsional)
              </label>

              <input
                type="datetime-local"
                value={form.availableFrom}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    availableFrom: event.target.value,
                  }))
                }
                className={inputClass}
              />

              <p className="mt-1 text-xs text-slate-400">Kosongkan agar langsung tersedia.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Batas waktu (opsional)
              </label>

              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueAt: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Membuat...' : 'Buat Penugasan'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
