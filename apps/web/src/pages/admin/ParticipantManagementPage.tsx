import { useEffect, useMemo, useState } from 'react';
import type { ProgramDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { ParticipantsPage } from './ParticipantsPage';
import { BatchesPage } from './BatchesPage';
import { EvaluatorRelationsPage } from './EvaluatorRelationsPage';
import { ImportsPage } from './ImportsPage';
import { OrganizationStructurePage } from './OrganizationStructurePage';

type ParticipantTab = 'participants' | 'batches' | 'organization' | 'relations' | 'imports';

const TABS: { id: ParticipantTab; label: string }[] = [
  { id: 'participants', label: 'Data Peserta' },
  { id: 'batches', label: 'Batch' },
  { id: 'organization', label: 'Struktur Organisasi' },
  { id: 'relations', label: 'Relasi Penilai' },
  { id: 'imports', label: 'Import & Validasi' },
];

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

export function ParticipantManagementPage({
  initialProgramId = '',
  onProgramChange,
}: {
  initialProgramId?: string;
  onProgramChange?: (programId: string) => void;
}): JSX.Element {
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [activeTab, setActiveTab] = useState<ParticipantTab>('participants');
  const [participantBatchFilter, setParticipantBatchFilter] = useState('');
  const [loading, setLoading] = useState(true);
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
        if (active) setError(caught instanceof ApiError ? caught.message : 'Program Assessment gagal dimuat.');
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
    setActiveTab('participants');
    setParticipantBatchFilter('');
  }

  function openBatchParticipants(batchId: string): void {
    setParticipantBatchFilter(batchId);
    setActiveTab('participants');
  }

  if (selectedProgram) {
    return (
      <section className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">Kelola Peserta</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{selectedProgram.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>Kode: {selectedProgram.code}</span>
                <span>Periode: {formatDate(selectedProgram.startDate)} – {formatDate(selectedProgram.endDate)}</span>
                <span>Status: {selectedProgram.status === 'ACTIVE' ? 'Aktif' : selectedProgram.status}</span>
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

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id
                  ? 'border-b-2 border-blue-600 px-4 py-3 text-sm font-medium text-blue-600'
                  : 'border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700'}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'participants' ? (
          <ParticipantsPage key={`${selectedProgram.id}-${participantBatchFilter}`} programId={selectedProgram.id} initialBatchId={participantBatchFilter} />
        ) : activeTab === 'batches' ? (
          <BatchesPage key={selectedProgram.id} programId={selectedProgram.id} onViewParticipants={openBatchParticipants} />
        ) : activeTab === 'organization' ? (
          <OrganizationStructurePage key={selectedProgram.id} programId={selectedProgram.id} />
        ) : activeTab === 'relations' ? (
          <EvaluatorRelationsPage key={selectedProgram.id} programId={selectedProgram.id} />
        ) : (
          <ImportsPage key={selectedProgram.id} programId={selectedProgram.id} />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">Kelola Peserta</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Pilih Program Assessment</h1>
        <p className="mt-2 text-sm text-slate-500">Semua data peserta, Batch, struktur, dan relasi disimpan dalam program yang dipilih.</p>
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
              <p className="mt-3 text-sm font-medium text-blue-600">Kelola peserta →</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
