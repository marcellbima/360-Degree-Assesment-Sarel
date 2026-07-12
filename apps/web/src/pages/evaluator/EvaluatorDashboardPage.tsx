import { useAuth } from '../../auth/AuthContext';

export function EvaluatorDashboardPage(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Sarel Assessment
          </p>
          <p className="text-xs text-slate-500">
            Workspace Evaluator
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700">
              {user?.fullName}
            </p>
            <p className="text-xs text-slate-500">
              Evaluator
            </p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Dashboard Evaluator
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Ringkasan Hasil Assessment
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Dashboard ini bersifat hanya-baca dan terpisah dari panel
            administrasi.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Tingkat Penyelesaian
            </p>
            <p className="mt-2 text-2xl font-semibold">
              —
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Hasil SELF
            </p>
            <p className="mt-2 text-2xl font-semibold">
              —
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Hasil OTHER
            </p>
            <p className="mt-2 text-2xl font-semibold">
              —
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">
            Analisis Kompetensi
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Perbandingan SELF dan OTHER, gap kompetensi, perbandingan unit,
            dan detail peserta akan ditambahkan pada tahap Dashboard
            Evaluator.
          </p>
        </div>
      </main>
    </div>
  );
}
