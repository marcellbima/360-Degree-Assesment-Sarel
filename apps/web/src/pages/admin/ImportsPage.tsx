import { useState, type ChangeEvent } from 'react';
import type { ImportPreviewResultDto } from '@sarel/shared';
import { ApiError, adminApi } from '../../lib/api';
import { downloadTemplate, parseImportFile, type ParsedRow } from '../../lib/import-parse';

type ImportKind = 'PARTICIPANT' | 'EVALUATOR';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ImportsPage({ programId }: { programId: string }): JSX.Element {
  const [kind, setKind] = useState<ImportKind>('PARTICIPANT');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreviewResultDto | null>(null);
  const [rowFilter, setRowFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resetResult(): void {
    setPreview(null);
    setFileName('');
    setMessage(null);
    setError(null);
    setRowFilter('');
  }

  function changeKind(nextKind: ImportKind): void {
    setKind(nextKind);
    resetResult();
  }

  function downloadTemplateFile(): void {
    if (kind === 'PARTICIPANT') {
      downloadTemplate('template_peserta.csv', ['user_id', 'batch_code']);
    } else {
      downloadTemplate('template_relasi_penilai.csv', [
        'subject_user_id',
        'evaluator_user_id',
        'assessment_type',
      ]);
    }
  }

  async function validateRows(parsedRows: ParsedRow[], selectedFileName: string): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreview(null);

    try {
      const result = kind === 'PARTICIPANT'
        ? await adminApi.imports.previewParticipants({
            programId,
            fileName: selectedFileName,
            rows: parsedRows.map((row) => ({
              rowNumber: row.rowNumber,
              userId: row.values.user_id ?? '',
              batchCode: row.values.batch_code ?? '',
            })),
          })
        : await adminApi.imports.previewEvaluators({
            programId,
            fileName: selectedFileName,
            rows: parsedRows.map((row) => ({
              rowNumber: row.rowNumber,
              subjectUserId: row.values.subject_user_id ?? '',
              evaluatorUserId: row.values.evaluator_user_id ?? '',
              assessmentType: row.values.assessment_type ?? '',
            })),
          });

      setPreview(result);
      if (result.job.errorRows === 0) {
        setMessage('File siap disimpan. Periksa ringkasan lalu klik Simpan Data.');
      }
    } catch (caught) {
      setError(errorMessage(caught, 'File gagal divalidasi.'));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setMessage(null);

    try {
      const parsedRows = await parseImportFile(file);
      if (parsedRows.length === 0) {
        setError('File tidak memiliki baris data.');
        return;
      }
      await validateRows(parsedRows, file.name);
    } catch {
      setError('File tidak dapat dibaca. Gunakan template CSV atau Excel yang disediakan.');
    }
  }

  async function saveData(): Promise<void> {
    if (!preview) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const job = await adminApi.imports.commit(preview.job.id);
      setPreview({ ...preview, job });
      setMessage(`${job.validRows} baris berhasil disimpan.`);
    } catch (caught) {
      setError(errorMessage(caught, 'Data gagal disimpan.'));
    } finally {
      setBusy(false);
    }
  }

  const job = preview?.job;
  const canSave = job != null && job.errorRows === 0 && job.status === 'PREVIEWED' && !busy;
  const filteredRows = (preview?.rows ?? []).filter((row) => !rowFilter || row.status === rowFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Import & Validasi</h1>
        <p className="mt-1 text-sm text-slate-500">Pilih jenis data lalu unggah file. Validasi berjalan otomatis.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => changeKind('PARTICIPANT')} className={`rounded-xl border p-4 text-left ${kind === 'PARTICIPANT' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <p className="font-semibold text-slate-900">Peserta</p>
          <p className="mt-1 text-sm text-slate-500">Tambahkan banyak akun yang sudah tersedia ke program. Batch bersifat opsional.</p>
        </button>
        <button type="button" onClick={() => changeKind('EVALUATOR')} className={`rounded-xl border p-4 text-left ${kind === 'EVALUATOR' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <p className="font-semibold text-slate-900">Relasi Penilai</p>
          <p className="mt-1 text-sm text-slate-500">Tambahkan banyak pasangan penilai dan peserta yang dinilai.</p>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-800">1. Siapkan file</p>
            <p className="mt-1 text-sm text-slate-500">
              {kind === 'PARTICIPANT'
                ? 'Gunakan template. Kolom batch_code boleh dikosongkan untuk peserta tanpa Batch.'
                : 'Gunakan template agar nama kolom langsung sesuai.'}
            </p>
          </div>
          <button type="button" onClick={downloadTemplateFile} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Unduh Template
          </button>
        </div>

        <div className="mt-5 rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
          <p className="font-medium text-slate-800">2. Unggah dan validasi</p>
          <p className="mt-1 text-sm text-slate-500">CSV atau Excel. Hasil pemeriksaan muncul otomatis.</p>
          <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {busy ? 'Memeriksa...' : 'Pilih File'}
            <input type="file" accept=".csv,.xlsx,.xls" disabled={busy} onChange={(event) => void onFile(event)} className="sr-only" />
          </label>
          {fileName ? <p className="mt-3 text-sm text-slate-600">{fileName}</p> : null}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      {job ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-800">3. Hasil validasi</p>
              <p className="mt-1 text-sm text-slate-500">Perbaiki file dan unggah ulang apabila masih ada baris bermasalah.</p>
            </div>
            <button type="button" disabled={!canSave} onClick={() => void saveData()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Menyimpan...' : job.status === 'COMMITTED' ? 'Sudah Disimpan' : 'Simpan Data'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <button type="button" onClick={() => setRowFilter('')} className="rounded-lg bg-slate-50 p-3 text-left"><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-xl font-semibold">{job.totalRows}</p></button>
            <button type="button" onClick={() => setRowFilter('VALID')} className="rounded-lg bg-emerald-50 p-3 text-left"><p className="text-xs text-emerald-700">Siap disimpan</p><p className="mt-1 text-xl font-semibold text-emerald-800">{job.validRows}</p></button>
            <button type="button" onClick={() => setRowFilter('SKIPPED')} className="rounded-lg bg-amber-50 p-3 text-left"><p className="text-xs text-amber-700">Sudah ada</p><p className="mt-1 text-xl font-semibold text-amber-800">{job.skippedRows}</p></button>
            <button type="button" onClick={() => setRowFilter('ERROR')} className="rounded-lg bg-red-50 p-3 text-left"><p className="text-xs text-red-700">Perlu diperbaiki</p><p className="mt-1 text-xl font-semibold text-red-800">{job.errorRows}</p></button>
          </div>

          {job.errorRows > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Data belum dapat disimpan karena masih ada {job.errorRows} baris bermasalah. Perbaiki file lalu unggah ulang.
            </div>
          ) : null}

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Baris</th>
                  <th className="px-3 py-2 font-medium">Hasil</th>
                  <th className="px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className={`px-3 py-2 font-medium ${row.status === 'ERROR' ? 'text-red-600' : row.status === 'SKIPPED' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {row.status === 'VALID' ? 'Siap' : row.status === 'SKIPPED' ? 'Sudah ada' : 'Perlu diperbaiki'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row.message ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
