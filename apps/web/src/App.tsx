import { useEffect, useState } from 'react';
import type { HealthResponse } from '@sarel/shared';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';

// Konten setelah login. Phase 3 hanya menampilkan ringkasan health sebagai placeholder.
function Dashboard(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health', { credentials: 'include' })
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError('Tidak dapat terhubung ke API.'));
  }, []);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-medium">API Health</h2>
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : health ? (
        <pre className="text-sm">{JSON.stringify(health, null, 2)}</pre>
      ) : (
        <p className="text-slate-400">Memuat...</p>
      )}
    </div>
  );
}

function Routed(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat...</div>
    );
  }
  if (!user) {
    return <LoginPage />;
  }
  return (
    <AppShell>
      <Dashboard />
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
