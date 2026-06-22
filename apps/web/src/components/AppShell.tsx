import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export interface NavItem {
  key: string;
  label: string;
}

export function AppShell({
  items,
  active,
  onSelect,
  children,
}: {
  items: NavItem[];
  active: string;
  onSelect: (key: string) => void;
  children: ReactNode;
}): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-60 flex-col bg-slate-900 p-4 text-slate-100 md:flex">
        <div className="text-lg font-semibold">Sarel Assessment</div>
        <nav className="mt-6 space-y-1 text-sm">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`block w-full rounded-lg px-3 py-2 text-left ${
                active === item.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            {user ? `${user.fullName} (${user.roles.join(', ')})` : ''}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Keluar
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
