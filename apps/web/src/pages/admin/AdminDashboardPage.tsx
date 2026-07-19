import { useEffect, useMemo, useState } from 'react';
import type { ProgramDto } from '@sarel/shared';
import { useAuth } from '../../auth/AuthContext';
import { ApiError, adminApi } from '../../lib/api';

interface ProgramSummary {
  program: ProgramDto;
  participants: number;
  relations: number;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function AdminDashboardPage(): JSX.Element {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    adminApi.programs
      .list({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then(async (programResult) => {
        const result = await Promise.all(
          programResult.items.map(async (program) => {
            const [participantResult, relationResult] = await Promise.all([
              adminApi.participants.list(program.id, { page: 1, pageSize: 1, status: 'ACTIVE' }),
              adminApi.relations.list(program.id, { page: 1, pageSize: 1, status: 'ACTIVE' }),
            ]);
            return {
              program,
              participants: participantResult.total,
              relations: relationResult.total,
            };
          }),
        );
        if (active) setSummaries(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, 'Ringkasan dashboard gagal dimuat.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(
    () => summaries.reduce(
      (current, item) => ({
        participants: current.participants + item.participants,
        relations: current.relations + item.relations,
      }),
      { participants: 0, relations: 0 },
    ),
    [summaries],
  );

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">Dashboard Administrasi</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Selamat datang, {user?.fullName}</h1>
        <p className="mt-2 text-sm text-slate-500">Ringkasan program, peserta, dan relasi penilai aktif.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Program Aktif</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '—' : summaries.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Peserta Aktif</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '—' : totals.participants}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Relasi Penilai</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '—' : totals.relations}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-800">Program Berjalan</h2>
        <p className="mt-1 text-sm text-slate-500">Pemeriksaan cepat kesiapan data sebelum penugasan assessment.</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memuat ringkasan...</div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">Belum ada program aktif.</p>
          <p className="mt-1 text-sm text-slate-500">Buat Program Assessment untuk memulai.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {summaries.map(({ program, participants, relations }) => (
            <article key={program.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{program.code}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{program.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Peserta</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{participants}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Relasi penilai</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{relations}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${participants > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {participants > 0 ? 'Peserta siap' : 'Peserta belum ada'}
                </span>
                <span className={`rounded-full px-2.5 py-1 font-medium ${relations > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {relations > 0 ? 'Relasi tersedia' : 'Relasi belum diatur'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
