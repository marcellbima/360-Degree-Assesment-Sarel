import { useEffect, useMemo, useState } from 'react';
import type { ProgramDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ProgramFirstModulePage({
  title,
  description,
  workspaceDescription,
  initialProgramId = '',
  onProgramChange,
}: {
  title: string;
  description: string;
  workspaceDescription: string;
  initialProgramId?: string;
  onProgramChange?: (programId: string) => void;
}): JSX.Element {
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [relationCount, setRelationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    adminApi.programs
      .list({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((result) => {
        if (!active) return;
        setPrograms(result.items);
        const requestedProgram = result.items.find((program) => program.id === initialProgramId);
        if (requestedProgram) {
          setSelectedProgramId(requestedProgram.id);
          onProgramChange?.(requestedProgram.id);
        } else if (result.items.length === 1) {
          const onlyProgramId = result.items[0]?.id ?? '';
          setSelectedProgramId(onlyProgramId);
          if (onlyProgramId) onProgramChange?.(onlyProgramId);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Program Assessment gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialProgramId, onProgramChange]);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  function selectProgram(programId: string): void {
    setSelectedProgramId(programId);
    onProgramChange?.(programId);
  }

  useEffect(() => {
    if (!selectedProgramId) {
      setParticipantCount(0);
      setRelationCount(0);
      return;
    }

    let active = true;
    setSummaryLoading(true);
    Promise.all([
      adminApi.participants.list(selectedProgramId, { page: 1, pageSize: 1, status: 'ACTIVE' }),
      adminApi.relations.list(selectedProgramId, { page: 1, pageSize: 1, status: 'ACTIVE' }),
    ])
      .then(([participants, relations]) => {
        if (!active) return;
        setParticipantCount(participants.total);
        setRelationCount(relations.total);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Ringkasan program gagal dimuat.'));
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProgramId]);

  if (selectedProgram) {
    return (
      <section className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">{title}</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{selectedProgram.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>Kode: {selectedProgram.code}</span>
                <span>Periode: {formatDate(selectedProgram.startDate)} – {formatDate(selectedProgram.endDate)}</span>
              </div>
            </div>

            {programs.length > 1 ? (
              <div>
                <label className="block text-xs font-medium text-slate-500">Ganti program</label>
                <select value={selectedProgramId} onChange={(event) => selectProgram(event.target.value)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Peserta aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summaryLoading ? '—' : participantCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Relasi penilai aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summaryLoading ? '—' : relationCount}</p>
          </div>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{workspaceDescription}</p>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bagian ini sudah mengikuti program yang dipilih, tetapi penyimpanan datanya belum tersedia pada source saat ini.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">{title}</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Pilih Program Assessment</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memuat Program Assessment...</div>
      ) : programs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">Belum ada program aktif.</p>
          <p className="mt-1 text-sm text-slate-500">Buat Program Assessment terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {programs.map((program) => (
            <button key={program.id} type="button" onClick={() => selectProgram(program.id)} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{program.code}</p>
              <h2 className="mt-1 font-semibold text-slate-900">{program.name}</h2>
              <p className="mt-4 text-sm font-medium text-blue-600">Buka program →</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
