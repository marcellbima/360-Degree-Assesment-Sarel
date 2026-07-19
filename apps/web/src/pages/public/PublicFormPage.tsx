import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { ApiError } from '../../lib/api';
import {
  publicFormPublicApi,
  type PublicFormView,
} from '../../lib/public-form-api';
import {
  PublicQuestionField,
} from './PublicQuestionField';

interface PublicFormPageProps {
  slug: string;
}

type Answers =
  Record<string, unknown>;

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'long',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function hasAnswer(
  value: unknown,
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (typeof value === 'string') {
    return (
      value.trim().length > 0
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(
      value as Record<
        string,
        unknown
      >,
    ).some(hasAnswer);
  }

  return true;
}

export function PublicFormPage({
  slug,
}: PublicFormPageProps): JSX.Element {
  const [form, setForm] =
    useState<PublicFormView | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<Answers>({});

  const [
    respondentName,
    setRespondentName,
  ] = useState('');

  const [
    respondentEmail,
    setRespondentEmail,
  ] = useState('');

  const [
    sectionIndex,
    setSectionIndex,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [submitted, setSubmitted] =
    useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    publicFormPublicApi
      .get(slug)
      .then((result) => {
        if (active) {
          setForm(result);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Formulir gagal dimuat.',
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
  }, [slug]);

  const questionOffset =
    useMemo(() => {
      if (!form) {
        return 0;
      }

      return form.definition.sections
        .slice(0, sectionIndex)
        .reduce(
          (
            total,
            section,
          ) =>
            total +
            section.questions.length,
          0,
        );
    }, [form, sectionIndex]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-fixed bg-no-repeat px-4 text-slate-500">
        Memuat formulir...
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-fixed bg-no-repeat px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            Formulir tidak tersedia
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {error ??
              'Formulir tidak ditemukan.'}
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-fixed bg-no-repeat px-4">
        <div className="w-full max-w-lg rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">
            ✓
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-slate-800">
            Jawaban berhasil dikirim
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Terima kasih telah mengisi{' '}
            <strong>
              {form.title}
            </strong>
            .
          </p>
        </div>
      </main>
    );
  }

  const sections =
    form.definition.sections;

  const currentSection =
    sections[sectionIndex];

  const lastSection =
    sectionIndex ===
    sections.length - 1;

  const progress =
    ((sectionIndex + 1) /
      sections.length) *
    100;

  function validateCurrentSection(): boolean {
    if (!currentSection) {
      return true;
    }

    const missing =
      currentSection.questions.find(
        (question) =>
          question.required &&
          !hasAnswer(
            answers[question.id],
          ),
      );

    if (missing) {
      setError(
        `Pertanyaan "${missing.title || 'Tanpa judul'}" wajib diisi.`,
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return false;
    }

    setError(null);
    return true;
  }

  function nextSection(): void {
    if (
      !validateCurrentSection()
    ) {
      return;
    }

    setSectionIndex(
      (current) =>
        Math.min(
          current + 1,
          sections.length - 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function previousSection(): void {
    setError(null);

    setSectionIndex(
      (current) =>
        Math.max(
          current - 1,
          0,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !validateCurrentSection()
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await publicFormPublicApi.submit(
        slug,
        {
          respondentName:
            respondentName.trim() ||
            null,
          respondentEmail:
            respondentEmail.trim() ||
            null,
          answers,
        },
      );

      setSubmitted(true);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Jawaban gagal dikirim.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentSection) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-fixed bg-no-repeat">
        Formulir tidak memiliki bagian.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08223d] bg-[url('/Bg.png')] bg-cover bg-center bg-fixed bg-no-repeat px-3 pb-32 pt-5 sm:px-4 sm:pt-8">
      <form
        onSubmit={(event) =>
          void submit(event)
        }
        className="mx-auto max-w-3xl space-y-4"
      >
        <div className="overflow-hidden rounded-2xl border border-cyan-300/60 bg-[#e2eef6]/95 shadow-lg backdrop-blur-sm">
          <div className="h-2.5 bg-blue-600" />

          <div className="p-5 sm:p-6">
            <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">
              {form.title}
            </h1>

            {form.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {form.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-blue-700">
                Langkah{' '}
                {sectionIndex + 1} dari{' '}
                {sections.length}
              </span>

              {form.closesAt ? (
                <span className="text-amber-700">
                  Batas:{' '}
                  {formatDateTime(
                    form.closesAt,
                  )}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {sectionIndex === 0 ? (
          <div className="rounded-2xl border border-cyan-300/60 bg-[#dcebf4]/95 p-5 shadow-lg backdrop-blur-sm">
            <h2 className="font-semibold text-slate-800">
              Identitas responden
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Nama dan email bersifat opsional.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">
                  Nama
                </span>

                <input
                  value={respondentName}
                  onChange={(event) =>
                    setRespondentName(
                      event.target.value,
                    )
                  }
                  maxLength={200}
                  className="w-full rounded-xl border border-blue-300 bg-white/80 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-600">
                  Email
                </span>

                <input
                  type="email"
                  value={respondentEmail}
                  onChange={(event) =>
                    setRespondentEmail(
                      event.target.value,
                    )
                  }
                  maxLength={200}
                  className="w-full rounded-xl border border-blue-300 bg-white/80 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </div>
        ) : null}

        {(currentSection.title ||
          currentSection.description) ? (
          <div className="rounded-2xl border border-cyan-300/60 bg-[#cfe3f1]/95 p-5 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Bagian{' '}
              {sectionIndex + 1}
            </p>

            {currentSection.title ? (
              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                {currentSection.title}
              </h2>
            ) : null}

            {currentSection.description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {
                  currentSection.description
                }
              </p>
            ) : null}
          </div>
        ) : null}

        {currentSection.questions.map(
          (question, localIndex) => {
            const number =
              questionOffset +
              localIndex +
              1;

            return (
              <article
                key={question.id}
                className="rounded-2xl border border-cyan-300/60 bg-[#dcebf4]/95 p-5 shadow-lg backdrop-blur-sm"
              >
                <p className="font-semibold leading-6 text-slate-800">
                  {number}.{' '}
                  {question.title ||
                    `Pertanyaan ${number}`}

                  {question.required ? (
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  ) : null}
                </p>

                {question.description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {
                      question.description
                    }
                  </p>
                ) : null}

                <div className="mt-4">
                  <PublicQuestionField
                    question={
                      question
                    }
                    answer={
                      answers[
                        question.id
                      ]
                    }
                    onChange={(value) =>
                      setAnswers(
                        (current) => ({
                          ...current,
                          [question.id]:
                            value,
                        }),
                      )
                    }
                  />
                </div>
              </article>
            );
          },
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-300/30 bg-[#071f38]/95 shadow-[0_-5px_20px_rgba(15,23,42,0.25)] backdrop-blur-md">
          <div className="h-1.5 bg-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              disabled={
                sectionIndex === 0
              }
              onClick={
                previousSection
              }
              className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-cyan-200/40 bg-white/10 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ←
            </button>

            <div className="text-center">
              <p className="text-xs font-medium text-cyan-100">
                Bagian{' '}
                {sectionIndex + 1}/
                {sections.length}
              </p>
            </div>

            {lastSection ? (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? 'Mengirim...'
                  : 'Kirim Jawaban'}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextSection}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Langkah berikutnya
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
