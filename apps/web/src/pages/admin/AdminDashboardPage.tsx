import {
  useEffect,
  useState,
} from 'react';

import {
  useAuth,
} from '../../auth/AuthContext';
import {
  ConfirmDialog,
} from '../../components/Modal';
import {
  ApiError,
  adminApi,
  type DemoWorkspaceStatus,
} from '../../lib/api';

export function AdminDashboardPage(): JSX.Element {
  const { user } = useAuth();

  const isSuperadmin =
    user?.roles.includes(
      'SUPERADMIN',
    ) ?? false;

  const [
    demoStatus,
    setDemoStatus,
  ] =
    useState<DemoWorkspaceStatus | null>(
      null,
    );

  const [
    demoLoading,
    setDemoLoading,
  ] =
    useState(false);

  const [
    demoError,
    setDemoError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    demoMessage,
    setDemoMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    confirmClear,
    setConfirmClear,
  ] =
    useState(false);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    let active = true;

    setDemoLoading(true);
    setDemoError(null);

    adminApi.demoWorkspace
      .status()
      .then((result) => {
        if (active) {
          setDemoStatus(result);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setDemoError(
            error instanceof ApiError
              ? error.message
              : 'Gagal memuat status data contoh.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setDemoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isSuperadmin]);

  async function loadDemoWorkspace():
    Promise<void> {
    setDemoLoading(true);
    setDemoError(null);
    setDemoMessage(null);

    try {
      const result =
        await adminApi
          .demoWorkspace
          .load();

      setDemoStatus(result);
      setDemoMessage(
        'Data contoh berhasil dimuat.',
      );
    } catch (error) {
      setDemoError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat data contoh.',
      );
    } finally {
      setDemoLoading(false);
    }
  }

  async function clearDemoWorkspace():
    Promise<void> {
    setDemoLoading(true);
    setDemoError(null);
    setDemoMessage(null);

    try {
      const result =
        await adminApi
          .demoWorkspace
          .clear();

      setDemoStatus(result);
      setDemoMessage(
        'Semua data contoh berhasil dihapus.',
      );
      setConfirmClear(false);
    } catch (error) {
      setDemoError(
        error instanceof ApiError
          ? error.message
          : 'Gagal menghapus data contoh.',
      );
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Dashboard Administrasi
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Selamat datang, {user?.fullName}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Kelola program assessment, peserta, penilai, form, dan proses
          pengerjaan dari workspace ini.
        </p>
      </div>

      {isSuperadmin ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-900">
                  Data Contoh Super Admin
                </h2>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    demoStatus?.loaded
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {demoLoading
                    ? 'Memuat...'
                    : demoStatus?.loaded
                      ? 'AKTIF'
                      : 'BELUM DIMUAT'}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Paket contoh digunakan untuk melihat alur aplikasi tanpa
                mengganggu data asli. Seluruh data contoh diberi tanda
                [CONTOH] dan dapat dihapus kembali.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={demoLoading}
                onClick={() =>
                  void loadDemoWorkspace()
                }
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {demoStatus?.loaded
                  ? 'Muat Ulang Data Contoh'
                  : 'Muat Data Contoh'}
              </button>

              <button
                type="button"
                disabled={
                  demoLoading ||
                  !demoStatus?.loaded
                }
                onClick={() =>
                  setConfirmClear(true)
                }
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus Semua Data Contoh
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs text-slate-500">
                Organisasi Contoh
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {demoStatus?.organizationCount ?? 0}
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs text-slate-500">
                Program Contoh
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {demoStatus?.programCount ?? 0}
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs text-slate-500">
                Batch Contoh
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {demoStatus?.batchCount ?? 0}
              </p>
            </div>
          </div>

          {demoMessage ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">
              {demoMessage}
            </p>
          ) : null}

          {demoError ? (
            <p className="mt-3 text-sm font-medium text-red-600">
              {demoError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Program Aktif
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            —
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Total Peserta
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            —
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Assessment Selesai
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            —
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-800">
          Ringkasan Operasional
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Data monitoring program, status SELF dan OTHER, tenggat waktu,
          serta kegagalan sinkronisasi akan ditampilkan pada tahap
          pengembangan Dashboard Admin.
        </p>
      </div>

      {confirmClear ? (
        <ConfirmDialog
          title="Hapus Semua Data Contoh"
          message="Seluruh organisasi, program, batch, dan data turunan contoh akan dihapus permanen. Data asli tidak akan terpengaruh."
          confirmLabel="Hapus Data Contoh"
          danger
          busy={demoLoading}
          error={demoError}
          onConfirm={() =>
            void clearDemoWorkspace()
          }
          onCancel={() => {
            if (!demoLoading) {
              setConfirmClear(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}
