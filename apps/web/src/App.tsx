import {
  useMemo,
  useState,
} from 'react';
import {
  AuthProvider,
  useAuth,
} from './auth/AuthContext';
import {
  AppShell,
  type NavItem,
} from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminModulePlaceholderPage } from './pages/admin/AdminModulePlaceholderPage';
import { ProgramFirstModulePage } from './pages/admin/ProgramFirstModulePage';
import { UsersPage } from './pages/admin/UsersPage';
import { ProgramsPage } from './pages/admin/ProgramsPage';
import { AdminScopesPage } from './pages/admin/AdminScopesPage';
import { ParticipantsPage } from './pages/admin/ParticipantsPage';
import { PublicFormsPage } from './pages/admin/PublicFormsPage';
import { EvaluatorDashboardPage } from './pages/evaluator/EvaluatorDashboardPage';
import { ParticipantAssessmentPage } from './pages/participant/ParticipantAssessmentPage';
import { PublicFormPage } from './pages/public/PublicFormPage';
import { PublicFormsLandingPage } from './pages/public/PublicFormsLandingPage';

function AdminWorkspace(): JSX.Element {
  const { user } =
    useAuth();

  const [view, setView] =
    useState('dashboard');

  const items =
    useMemo<NavItem[]>(() => {
      const permissions =
        new Set(
          user?.permissions ?? [],
        );

      const roles =
        new Set(
          user?.roles ?? [],
        );

      const isSuperAdmin =
        roles.has(
          'SUPERADMIN',
        );

      const can = (
        permission: string,
      ): boolean =>
        isSuperAdmin ||
        permissions.has(
          permission,
        );

      const availableItems: {
        item: NavItem;
        visible: boolean;
      }[] = [
        {
          item: {
            key: 'dashboard',
            label: 'Dashboard Admin',
          },
          visible: true,
        },

        {
          item: {
            key: 'programs',
            label: 'Program Assessment',
            section: 'Assessment',
          },
          visible:
            can('program.read'),
        },
        {
          item: {
            key: 'form-builder',
            label: 'Form Builder',
            section: 'Assessment',
          },
          visible:
            can('quiz.read') ||
            can('quiz.manage'),
        },
        {
          item: {
            key: 'assignments',
            label: 'Penugasan Assessment',
            section: 'Assessment',
          },
          visible:
            can('assessment.read') ||
            can('assessment.manage'),
        },

        {
          item: {
            key: 'users',
            label: 'Kelola Akun',
            section:
              'Peserta & Akses',
          },
          visible:
            can('user.read'),
        },
        {
          item: {
            key: 'participants',
            label: 'Kelola Peserta',
            section:
              'Peserta & Akses',
          },
          visible:
            can('participant.read'),
        },
        {
          item: {
            key: 'monitoring',
            label:
              'Monitoring Pengerjaan',
            section: 'Monitoring',
          },
          visible:
            can('monitoring.read'),
        },
        {
          item: {
            key: 'history',
            label:
              'Histori Pengerjaan',
            section: 'Monitoring',
          },
          visible:
            can('monitoring.read'),
        },
        {
          item: {
            key: 'answers-results',
            label: 'Jawaban & Hasil',
            section: 'Monitoring',
          },
          visible:
            can('assessment.read') ||
            can('report.read'),
        },

        {
          item: {
            key: 'reports',
            label: 'Laporan & Export',
            section: 'Laporan',
          },
          visible:
            can('report.read'),
        },

        {
          item: {
            key: 'scopes',
            label: 'Admin Scopes',
            section: 'Sistem',
          },
          visible:
            isSuperAdmin,
        },
        {
          item: {
            key: 'audit-log',
            label: 'Log Aktivitas',
            section: 'Sistem',
          },
          visible:
            isSuperAdmin,
        },
        {
          item: {
            key: 'system-settings',
            label:
              'Pengaturan Sistem',
            section: 'Sistem',
          },
          visible:
            isSuperAdmin,
        },
      ];

      return availableItems
        .filter(
          ({ visible }) =>
            visible,
        )
        .map(
          ({ item }) =>
            item,
        );
    }, [user]);

  const active =
    items.some(
      (item) =>
        item.key === view,
    )
      ? view
      : 'dashboard';

  return (
    <AppShell
      items={items}
      active={active}
      onSelect={setView}
    >
      {active === 'users' ? (
        <UsersPage />
      ) : active ===
        'programs' ? (
        <ProgramsPage />
      ) : active ===
        'participants' ? (
        <ParticipantsPage />
      ) : active ===
        'form-builder' ? (
        <PublicFormsPage />
      ) : active ===
        'assignments' ? (
        <ProgramFirstModulePage
          title="Penugasan Assessment"
          description="Pilih Program Assessment sebelum mengatur assignment SELF dan OTHER."
          workspaceDescription="Assignment SELF dan OTHER, form, versi form, peserta, batch, relasi penilai, serta periode pengerjaan akan dikelola khusus untuk program ini."
        />
      ) : active ===
        'monitoring' ? (
        <ProgramFirstModulePage
          title="Monitoring Pengerjaan"
          description="Pilih Program Assessment untuk melihat progres peserta dan assignment."
          workspaceDescription="Ringkasan SELF dan OTHER, status peserta, tenggat waktu, keterlambatan, serta progress setiap assignment akan ditampilkan khusus untuk program ini."
        />
      ) : active ===
        'history' ? (
        <ProgramFirstModulePage
          title="Histori Pengerjaan"
          description="Pilih Program Assessment sebelum menelusuri histori setiap peserta."
          workspaceDescription="Daftar peserta akan ditampilkan terlebih dahulu, kemudian histori mulai, autosave, submit, reset, force submit, dan perubahan status dapat ditelusuri per peserta."
        />
      ) : active ===
        'answers-results' ? (
        <ProgramFirstModulePage
          title="Jawaban & Hasil"
          description="Pilih Program Assessment sebelum melihat jawaban dan hasil peserta."
          workspaceDescription="Hasil SELF, OTHER, perbandingan SELF vs OTHER, hasil per level penilai, serta detail jawaban akan ditampilkan per peserta dan assignment."
        />
      ) : active ===
        'reports' ? (
        <ProgramFirstModulePage
          title="Laporan & Export"
          description="Pilih Program Assessment yang akan dibuatkan laporan atau export."
          workspaceDescription="Laporan peserta, relasi, assignment, monitoring, hasil individual, hasil kelompok, dan export akan dibatasi hanya untuk program yang dipilih."
        />
      ) : active ===
        'scopes' ? (
        <AdminScopesPage />
      ) : active ===
        'audit-log' ? (
        <AdminModulePlaceholderPage
          title="Log Aktivitas"
          description="Menampilkan aktivitas penting pengguna dan administrator untuk kebutuhan audit."
        />
      ) : active ===
        'system-settings' ? (
        <AdminModulePlaceholderPage
          title="Pengaturan Sistem"
          description="Mengelola konfigurasi aplikasi, keamanan, integrasi, dan pengaturan operasional sistem."
        />
      ) : (
        <AdminDashboardPage />
      )}
    </AppShell>
  );
}

function NoAccessPage(): JSX.Element {
  const { logout } =
    useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-800">
          Akses belum tersedia
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Akun ini belum memiliki role yang dapat digunakan untuk masuk ke
          aplikasi.
        </p>

        <button
          type="button"
          onClick={() =>
            void logout()
          }
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Keluar
        </button>
      </div>
    </main>
  );
}

function Routed(): JSX.Element {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Memuat...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const roles =
    new Set(user.roles);

  if (
    roles.has('SUPERADMIN') ||
    roles.has('ADMIN')
  ) {
    return <AdminWorkspace />;
  }

  if (
    roles.has('EVALUATOR')
  ) {
    return (
      <EvaluatorDashboardPage />
    );
  }

  if (roles.has('USER')) {
    return (
      <ParticipantAssessmentPage />
    );
  }

  return <NoAccessPage />;
}

function getPublicFormSlug(): string | null {
  const match =
    window.location.pathname.match(
      /^\/forms\/([^/]+)\/?$/,
    );

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(
      match[1],
    );
  } catch {
    return null;
  }
}

export default function App(): JSX.Element {
  const normalizedPath =
    window.location.pathname
      .replace(/\/+$/, '') ||
    '/';

  if (
    normalizedPath === '/forms'
  ) {
    return (
      <PublicFormsLandingPage />
    );
  }

  const publicFormSlug =
    getPublicFormSlug();

  if (publicFormSlug) {
    return (
      <PublicFormPage
        slug={publicFormSlug}
      />
    );
  }

  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  );
}
