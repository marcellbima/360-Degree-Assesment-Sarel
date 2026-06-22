import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

const NAV_ITEMS = ['Dashboard', 'Program', 'Batch', 'Assessment', 'Monitoring', 'Report'];

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-60 flex-col bg-slate-900 p-4 text-slate-100 md:flex">
        <div className="text-lg font-semibold">Sarel Assessment</div>
        <nav className="mt-6 space-y-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <div key={item} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
              {item}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Selamat datang</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-slate-700">{user?.fullName}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            >
              Keluar
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
