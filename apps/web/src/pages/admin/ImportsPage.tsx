import { useEffect, useState, type ChangeEvent } from 'react';
import type { ImportPreviewResultDto, ProgramDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { downloadTemplate, parseImportFile, type ParsedRow } from '../../lib/import-parse';

type ImportKind = 'PARTICIPANT' | 'EVALUATOR';

export function ImportsPage(): JSX.Element {
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [programId, setProgramId] = useState('');
  const [kind, setKind] = useState<ImportKind>('PARTICIPANT');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResultDto | null>(null);
  const [rowFilter, setRowFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [committedMsg, setCommittedMsg] = useState<string | null>(null);

  useEffect(() => {
    adminApi.programs.list({ pageSize: 100, status: 'ACTIVE' }).then((r) => {
      setPrograms(r.items);
      if (r.items[0]) setProgramId((p) => p || r.items[0].id);
    }).catch(() => setError('Gagal memuat program.'));
  }, []);

  function resetResult(): void {
    setPreview(null);
    setCommittedMsg(null);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    resetResult();
    setError(null);
    try {
      const parsed = await parseImportFile(file);
      setRows(parsed);
      setFileName(file.name);
    } catch {
      setError('Gagal membaca file.');
    }
  }

  function downloadTpl(): void {
    if (kind === 'PARTICIPANT') downloadTemplate('participant_template.csv', ['user_id', 'batch_code']);
    else downloadTemplate('evaluator_template.csv', ['subject_user_id', 'evaluator_user_id', 'assessment_type']);
  }

  async function runPreview(): Promise<void> {
    setBusy(true);
    setError(null);
    setCommittedMsg(null);
    try {
      if (kind === 'PARTICIPANT') {
        const body = {
          programId,
          fileName,
          rows: rows.map((r) => ({ rowNumber: r.rowNumber, userId: r.values.user_id ?? '', batchCode: r.values.batch_code ?? '' })),
        };
        setPreview(await adminApi.imports.previewParticipants(body));
      } else {
        const body = {
          programId,
          fileName,
          rows: rows.map((r) => ({
            rowNumber: r.rowNumber,
            subjectUserId: r.values.subject_user_id ?? '',
            evaluatorUserId: r.values.evaluator_user_id ?? '',
            assessmentType: r.values.assessment_type ?? '',
          })),
        };
        setPreview(await adminApi.imports.previewEvaluators(body));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Preview gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function runCommit(): Promise<void> {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const job = await adminApi.imports.commit(preview.job.id);
      setCommittedMsg(`Import ${job.status}. ${job.validRows} baris valid diterapkan.`);
      setPreview({ ...preview, job: { ...preview.job, status: job.status } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Commit gagal.');
    } finally {
      setBusy(false);
    }
  }

  const job = preview?.job;
  const canCommit = job != null && job.errorRows === 0 && job.status === 'PREVIEWED' && !busy;
  const filteredRows = (preview?.rows ?? []).filter((r) => !rowFilter || r.status === rowFilter);
  const inputClass = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Imports</h1>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Program</label>
            <select value={programId} onChange={(e) => { setProgramId(e.target.value); resetResult(); }} className={inputClass}>
              {programs.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Jenis Import</label>
            <select value={kind} onChange={(e) => { setKind(e.target.value as ImportKind); resetResult(); }} className={inputClass}>
              <option value="PARTICIPANT">Participant</option>
              <option value="EVALUATOR">Evaluator Relation</option>
            </select>
          </div>
          <button type="button" onClick={downloadTpl} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Download Template</button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => void onFile(e)} className="text-sm" />
          {fileName ? <span className="text-sm text-slate-500">{fileName} — {rows.length} baris</span> : null}
          <button type="button" disabled={busy || rows.length === 0 || !programId} onClick={() => void runPreview()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Memproses...' : 'Preview'}
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {committedMsg ? <p className="text-sm text-green-600">{committedMsg}</p> : null}
      </div>

      {job ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>Status: <strong>{job.status}</strong></span>
            <span className="text-slate-600">VALID: {job.validRows}</span>
            <span className="text-amber-600">SKIPPED: {job.skippedRows}</span>
            <span className="text-red-600">ERROR: {job.errorRows}</span>
            <button type="button" disabled={!canCommit} onClick={() => void runCommit()} className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Commit
            </button>
          </div>

          <select value={rowFilter} onChange={(e) => setRowFilter(e.target.value)} className={inputClass}>
            <option value="">Semua baris</option>
            <option value="VALID">VALID</option>
            <option value="SKIPPED">SKIPPED</option>
            <option value="ERROR">ERROR</option>
          </select>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-3 py-2 font-medium">Baris</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Pesan</th></tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.rowNumber}</td>
                    <td className={`px-3 py-2 ${r.status === 'ERROR' ? 'text-red-600' : r.status === 'SKIPPED' ? 'text-amber-600' : 'text-green-600'}`}>{r.status}</td>
                    <td className="px-3 py-2 text-slate-500">{r.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {job.errorRows > 0 ? <p className="text-xs text-red-600">Commit dinonaktifkan karena ada baris ERROR.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
