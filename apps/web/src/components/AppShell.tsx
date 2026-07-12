import type {
  ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';

export interface NavItem {
  key: string;
  label: string;
  section?: string;
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
  const {
    user,
    logout,
  } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 px-3 py-5 text-slate-100 md:flex">
        <div className="px-2 text-lg font-semibold">
          Sarel Assessment
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto pb-5 text-sm">
          {items.map(
            (
              item,
              index,
            ) => {
              const previousSection =
                index > 0
                  ? items[index - 1]?.section
                  : undefined;

              const showSection =
                Boolean(item.section) &&
                item.section !==
                  previousSection;

              return (
                <div key={item.key}>
                  {showSection ? (
                    <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {item.section}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      onSelect(
                        item.key,
                      )
                    }
                    className={`mb-1 block w-full rounded-lg px-3 py-2.5 text-left transition ${
                      active === item.key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                </div>
              );
            },
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            {user
              ? `${user.fullName} (${user.roles.join(', ')})`
              : ''}
          </div>

          <button
            type="button"
            onClick={() =>
              void logout()
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Keluar
          </button>
        </header>

        <main className="min-w-0 flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
