import { useEffect, useState } from 'react';
import type { HealthResponse } from '@sarel/shared';

// Skeleton Phase 2: hanya memverifikasi koneksi ke GET /api/health.
export default function App(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError('Tidak dapat terhubung ke API.'));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
      <h1 className="text-2xl font-semibold">Sarel Assessment</h1>
      <p className="mt-2 text-slate-500">Foundation skeleton (Phase 2).</p>
      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-medium">API Health</h2>
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : health ? (
          <pre className="text-sm">{JSON.stringify(health, null, 2)}</pre>
        ) : (
          <p className="text-slate-400">Memuat...</p>
        )}
      </div>
    </main>
  );
}
