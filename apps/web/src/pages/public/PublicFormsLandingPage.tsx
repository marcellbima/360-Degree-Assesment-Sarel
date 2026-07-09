import {
  useEffect,
  useState,
} from 'react';

import { ApiError } from '../../lib/api';

import {
  publicFormPublicApi,
  type PublicFormCatalogItem,
} from '../../lib/public-form-api';

function openForm(slug: string): void {
  window.location.href =
    `/forms/${encodeURIComponent(slug)}`;
}

export function PublicFormsLandingPage(): JSX.Element {
  const [forms, setForms] =
    useState<PublicFormCatalogItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    publicFormPublicApi
      .list()
      .then((result) => {
        if (active) {
          setForms(result);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Daftar assessment gagal dimuat.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-no-repeat text-white">
      <header className="border-b border-cyan-300/20 bg-[#061a30]/95 shadow-lg backdrop-blur-sm">
        <div className="flex w-full items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/forms';
            }}
            aria-label="Halaman utama Sarel Assessment"
            className="rounded-lg p-1"
          >
            <img
              src="/logo-sarel.png"
              alt="Sarel"
              className="h-auto w-24 object-contain sm:w-28"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="rounded-xl border border-white/70 bg-white/95 px-5 py-2.5 text-sm font-semibold tracking-wide text-[#08223d] shadow-md transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-lg sm:px-6"
          >
            MASUK ›
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center">
          <p className="text-lg uppercase tracking-[0.2em] text-slate-300">
            Welcome to
          </p>

          <h1 className="mt-2 text-4xl font-light sm:text-6xl">
            Sarel Assessment Apps
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300">
            Pilih assessment yang tersedia untuk mulai mengerjakan.
          </p>
        </div>

        <div className="mt-12">
          {loading ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-10 text-center text-slate-300">
              Memuat assessment...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-300/30 bg-red-500/10 p-8 text-center text-red-100">
              {error}
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-10 text-center">
              <h2 className="text-xl font-medium">
                Belum ada assessment tersedia
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                Assessment akan muncul setelah dipublikasikan oleh administrator.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-7">
              {forms.map((form, index) => (
                <article
                  key={form.id}
                  className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#123b61] shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/50"
                >
                  <div className="relative h-40 bg-gradient-to-br from-cyan-100 via-slate-100 to-blue-200">
                    <div className="absolute bottom-5 left-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white shadow-lg">
                      {String(index + 1).padStart(
                        2,
                        '0',
                      )}
                    </div>

                    <span className="absolute bottom-5 right-5 text-xs font-semibold uppercase tracking-widest text-slate-600">
                      Assessment
                    </span>
                  </div>

                  <div className="flex min-h-72 flex-col p-6">
                    <h2 className="text-2xl font-light uppercase leading-tight">
                      {form.title}
                    </h2>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-200">
                      {form.description ??
                        'Klik untuk mulai mengerjakan assessment.'}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-cyan-100">
                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {form.questionCount}{' '}
                        pertanyaan
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {form.sectionCount}{' '}
                        bagian
                      </span>
                    </div>

                    <div className="mt-auto pt-6">
                      <button
                        type="button"
                        onClick={() =>
                          openForm(form.slug)
                        }
                        className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow hover:bg-slate-100"
                      >
                        MULAI ASSESSMENT ›
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
