import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell, type NavItem } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/admin/UsersPage';
import { OrganizationsPage } from './pages/admin/OrganizationsPage';
import { ProgramsPage } from './pages/admin/ProgramsPage';
import { BatchesPage } from './pages/admin/BatchesPage';
import { AdminScopesPage } from './pages/admin/AdminScopesPage';
import { ParticipantsPage } from './pages/admin/ParticipantsPage';
import { EvaluatorRelationsPage } from './pages/admin/EvaluatorRelationsPage';
import { ImportsPage } from './pages/admin/ImportsPage';

function Dashboard(): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-500">
        Selamat datang di panel administrasi Sarel Assessment.
      </p>
    </div>
  );
}

function Routed(): JSX.Element {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');

  const items = useMemo<NavItem[]>(() => {
    const perms = new Set(user?.permissions ?? []);
    const roles = new Set(user?.roles ?? []);
    const all: { item: NavItem; visible: boolean }[] = [
      { item: { key: 'dashboard', label: 'Dashboard' }, visible: true },
      { item: { key: 'users', label: 'Users' }, visible: perms.has('user.read') },
      { item: { key: 'organizations', label: 'Organizations' }, visible: perms.has('organization.read') },
      { item: { key: 'programs', label: 'Programs' }, visible: perms.has('program.read') },
      { item: { key: 'batches', label: 'Batches' }, visible: perms.has('batch.read') },
      { item: { key: 'participants', label: 'Participants' }, visible: perms.has('participant.read') },
      { item: { key: 'relations', label: 'Evaluator Relations' }, visible: perms.has('evaluator.read') },
      {
        item: { key: 'imports', label: 'Imports' },
        visible: perms.has('participant.import') || perms.has('evaluator.import'),
      },
      { item: { key: 'scopes', label: 'Admin Scopes' }, visible: roles.has('SUPERADMIN') },
    ];
    return all.filter((x) => x.visible).map((x) => x.item);
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat...</div>
    );
  }
  if (!user) {
    return <LoginPage />;
  }

  const active = items.some((i) => i.key === view) ? view : 'dashboard';

  return (
    <AppShell items={items} active={active} onSelect={setView}>
      {active === 'users' ? (
        <UsersPage />
      ) : active === 'organizations' ? (
        <OrganizationsPage />
      ) : active === 'programs' ? (
        <ProgramsPage />
      ) : active === 'batches' ? (
        <BatchesPage />
      ) : active === 'participants' ? (
        <ParticipantsPage />
      ) : active === 'relations' ? (
        <EvaluatorRelationsPage />
      ) : active === 'imports' ? (
        <ImportsPage />
      ) : active === 'scopes' ? (
        <AdminScopesPage />
      ) : (
        <Dashboard />
      )}
    </AppShell>
  );
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  );
}
