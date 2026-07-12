import { useAuth } from '../../auth/AuthContext';

export function ParticipantAssessmentPage(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Sarel Assessment
          </p>
          <p className="text-xs text-slate-500">
            Pengerjaan Assessment
          </p>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Keluar
        </button>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 p-5 md:p-8">
        <div>
          <p className="text-sm text-slate-500">
            Peserta
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {user?.fullName}
          </h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Tugas Assessment
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Belum ada tugas assessment yang dapat ditampilkan.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Setelah modul assignment tersedia, halaman ini akan langsung
            menampilkan assessment SELF atau daftar target OTHER yang harus
            dikerjakan.
          </p>
        </div>
      </main>
    </div>
  );
}
