import { useState } from 'react';

import { RichTextEditor } from '../../components/RichTextEditor';
import { ApiError } from '../../lib/api';
import {
  richTextToPlainText,
} from '../../lib/rich-text';
import {
  publicFormAdminApi,
  type PublicFormRecord,
} from '../../lib/public-form-api';
import { FormPreviewDialog } from './FormPreviewDialog';

type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multiple_choice'
  | 'scale'
  | 'grid'
  | 'title_description';

interface FormQuestion {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  required: boolean;
  showOptionLabels?: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  gridRows: string[];
}

interface FormSection {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
}

interface FormDefinition {
  title: string;
  description: string;
  sections: FormSection[];
}

interface FormBuilderPageProps {
  initialRecord?: PublicFormRecord;
  onSaved?: (
    record: PublicFormRecord,
  ) => void;
}

function normalizeSlug(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: 'Jawaban singkat',
  paragraph: 'Paragraf',
  single_choice: 'Pilihan tunggal',
  multiple_choice: 'Kotak centang',
  scale: 'Skala linear',
  grid: 'Grid pilihan',
  title_description:
    'Judul dan deskripsi',
};

function createQuestion(): FormQuestion {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    type: 'short_text',
    required: false,
    showOptionLabels: false,
    options: [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: '',
    scaleMaxLabel: '',
    gridRows: [],
  };
}

function createSection(): FormSection {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    questions: [createQuestion()],
  };
}

function createInitialForm(): FormDefinition {
  return {
    title: '',
    description: '',
    sections: [createSection()],
  };
}

export function FormBuilderPage({
  initialRecord,
  onSaved,
}: FormBuilderPageProps): JSX.Element {
  const [form, setForm] =
    useState<FormDefinition>(
      () =>
        initialRecord
          ?.draftDefinition ??
        createInitialForm(),
    );

  const [
    activeSectionId,
    setActiveSectionId,
  ] = useState(
    initialRecord
      ?.draftDefinition
      .sections[0]?.id ?? '',
  );

  const [record, setRecord] =
    useState<PublicFormRecord | null>(
      initialRecord ?? null,
    );

  const [slug, setSlug] =
    useState(
      initialRecord?.slug ?? '',
    );

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const [publishing, setPublishing] =
    useState(false);

  const [creatingSheet, setCreatingSheet] =
    useState(false);

  const [
    disconnectingSheet,
    setDisconnectingSheet,
  ] = useState(false);

  async function changePublishStatus(): Promise<void> {
    if (!record) {
      setSaveError(
        'Simpan draft terlebih dahulu sebelum dipublikasikan.',
      );
      return;
    }

    setPublishing(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated =
        record.status === 'PUBLISHED'
          ? await publicFormAdminApi.unpublish(
              record.id,
            )
          : await publicFormAdminApi.publish(
              record.id,
            );

      setRecord(updated);
      onSaved?.(updated);

      setSaveMessage(
        updated.status === 'PUBLISHED'
          ? 'Form berhasil dipublikasikan.'
          : 'Publikasi form berhasil dibatalkan.',
      );
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught.message
          : 'Status publikasi gagal diperbarui.',
      );
    } finally {
      setPublishing(false);
    }
  }

  async function createGoogleSheet(): Promise<void> {
    if (!record) {
      setSaveError(
        'Simpan draft terlebih dahulu.',
      );
      return;
    }

    setCreatingSheet(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated =
        await publicFormAdminApi
          .createGoogleSheet(record.id);

      setRecord(updated);
      onSaved?.(updated);

      setSaveMessage(
        'Google Sheet berhasil dibuat.',
      );
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught.message
          : 'Google Sheet gagal dibuat.',
      );
    } finally {
      setCreatingSheet(false);
    }
  }

  async function disconnectGoogleSheet(): Promise<void> {
    if (!record) {
      return;
    }

    const confirmed = window.confirm(
      'Putuskan Google Sheet dari form ini? Sheet lama tidak akan dihapus.',
    );

    if (!confirmed) {
      return;
    }

    setDisconnectingSheet(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated =
        await publicFormAdminApi
          .disconnectGoogleSheet(
            record.id,
          );

      setRecord(updated);
      onSaved?.(updated);

      setSaveMessage(
        'Google Sheet berhasil dilepas. Anda dapat membuat Sheet baru.',
      );
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught.message
          : 'Google Sheet gagal dilepas.',
      );
    } finally {
      setDisconnectingSheet(false);
    }
  }

  async function saveDraft(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const normalizedSlug =
      normalizeSlug(
        slug ||
          richTextToPlainText(
            form.title,
          ),
      );

    setSlug(normalizedSlug);

    try {
      const saved = record
        ? await publicFormAdminApi.update(
            record.id,
            {
              slug: normalizedSlug,
              definition: form,
            },
          )
        : await publicFormAdminApi.create({
            slug: normalizedSlug,
            definition: form,
          });

      setRecord(saved);
      setSlug(saved.slug);
      setSaveMessage(
        'Draft berhasil disimpan.',
      );

      onSaved?.(saved);
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught.message
          : 'Draft gagal disimpan.',
      );
    } finally {
      setSaving(false);
    }
  }

  function updateSection(
    sectionId: string,
    patch: Partial<FormSection>,
  ): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, ...patch }
          : section,
      ),
    }));
  }

  function updateQuestion(
    sectionId: string,
    questionId: string,
    patch: Partial<FormQuestion>,
  ): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId
                  ? { ...question, ...patch }
                  : question,
              ),
            }
          : section,
      ),
    }));
  }

  function changeQuestionType(
    sectionId: string,
    question: FormQuestion,
    type: QuestionType,
  ): void {
    const patch: Partial<FormQuestion> = { type };

    if (
      (type === 'single_choice' ||
        type === 'multiple_choice') &&
      question.options.length === 0
    ) {
      patch.options = [''];
    }

    if (type === 'grid') {
      if (question.options.length === 0) {
        patch.options = [''];
      }

      if (question.gridRows.length === 0) {
        patch.gridRows = [''];
      }
    }

    updateQuestion(
      sectionId,
      question.id,
      patch,
    );
  }

  function addQuestion(sectionId: string): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: [
                ...section.questions,
                createQuestion(),
              ],
            }
          : section,
      ),
    }));
  }

  function duplicateQuestion(
    sectionId: string,
    question: FormQuestion,
  ): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: [
                ...section.questions,
                {
                  ...question,
                  id: crypto.randomUUID(),
                  options: [...question.options],
                  gridRows: [...question.gridRows],
                },
              ],
            }
          : section,
      ),
    }));
  }

  function deleteQuestion(
    sectionId: string,
    questionId: string,
  ): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter(
                (question) =>
                  question.id !== questionId,
              ),
            }
          : section,
      ),
    }));
  }

  function addSection(): void {
    const section = createSection();

    setForm((current) => ({
      ...current,
      sections: [
        ...current.sections,
        section,
      ],
    }));

    setActiveSectionId(section.id);
  }

  function deleteSection(sectionId: string): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter(
        (section) => section.id !== sectionId,
      ),
    }));
  }

  function getToolbarSectionId():
    string | null {
    const activeExists =
      form.sections.some(
        (section) =>
          section.id ===
          activeSectionId,
      );

    if (activeExists) {
      return activeSectionId;
    }

    return (
      form.sections[
        form.sections.length - 1
      ]?.id ?? null
    );
  }

  function toolbarAddQuestion(): void {
    const sectionId =
      getToolbarSectionId();

    if (sectionId) {
      addQuestion(sectionId);
    }
  }

  function toolbarAddTitleDescription(): void {
    const sectionId =
      getToolbarSectionId();

    if (!sectionId) {
      return;
    }

    const block: FormQuestion = {
      ...createQuestion(),
      type: 'title_description',
      title: '',
      description: '',
      required: false,
    };

    setForm((current) => ({
      ...current,
      sections: current.sections.map(
        (section) =>
          section.id === sectionId
            ? {
                ...section,
                questions: [
                  ...section.questions,
                  block,
                ],
              }
            : section,
      ),
    }));
  }

  function toolbarDuplicateQuestion(): void {
    const sectionId =
      getToolbarSectionId();

    const section =
      form.sections.find(
        (item) =>
          item.id === sectionId,
      );

    const question =
      section?.questions[
        section.questions.length - 1
      ];

    if (
      sectionId &&
      question
    ) {
      duplicateQuestion(
        sectionId,
        question,
      );
    }
  }

  function updateListValue(
    sectionId: string,
    question: FormQuestion,
    field: 'options' | 'gridRows',
    index: number,
    value: string,
  ): void {
    const values = [...question[field]];
    values[index] = value;

    updateQuestion(
      sectionId,
      question.id,
      { [field]: values },
    );
  }

  function addListValue(
    sectionId: string,
    question: FormQuestion,
    field: 'options' | 'gridRows',
  ): void {
    updateQuestion(
      sectionId,
      question.id,
      {
        [field]: [
          ...question[field],
          '',
        ],
      },
    );
  }

  function removeListValue(
    sectionId: string,
    question: FormQuestion,
    field: 'options' | 'gridRows',
    index: number,
  ): void {
    updateQuestion(
      sectionId,
      question.id,
      {
        [field]: question[field].filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
      },
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl space-y-5">
      <aside
        aria-label="Toolbar Form Builder"
        className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg xl:flex"
      >
        <button
          type="button"
          title="Tambah pertanyaan"
          onClick={toolbarAddQuestion}
          className="h-12 w-12 text-3xl text-slate-600 hover:bg-blue-50 hover:text-blue-600"
        >
          +
        </button>

        <button
          type="button"
          title="Duplikasi pertanyaan terakhir"
          onClick={
            toolbarDuplicateQuestion
          }
          className="h-12 w-12 border-t border-slate-200 text-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600"
        >
          ⧉
        </button>

        <button
          type="button"
          title="Tambah judul dan deskripsi"
          onClick={
            toolbarAddTitleDescription
          }
          className="h-12 w-12 border-t border-slate-200 text-lg font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600"
        >
          Tt
        </button>

        <button
          type="button"
          title="Gambar belum didukung"
          disabled
          className="h-12 w-12 border-t border-slate-200 text-lg text-slate-300"
        >
          ▧
        </button>

        <button
          type="button"
          title="Video belum didukung"
          disabled
          className="h-12 w-12 border-t border-slate-200 text-lg text-slate-300"
        >
          ▶
        </button>

        <button
          type="button"
          title="Tambah bagian"
          onClick={addSection}
          className="h-12 w-12 border-t border-slate-200 text-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600"
        >
          ▤
        </button>
      </aside>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Form Builder
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Buat dan sesuaikan formulir secara manual.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {record?.googleSheetStatus ===
              'CONNECTED' &&
            record.googleSheetUrl ? (
              <>
                <a
                  href={record.googleSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Buka Google Sheet
                </a>

                <button
                  type="button"
                  disabled={disconnectingSheet}
                  onClick={() =>
                    void disconnectGoogleSheet()
                  }
                  className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {disconnectingSheet
                    ? 'Melepas...'
                    : 'Unlink Sheet'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!record || creatingSheet}
                onClick={() =>
                  void createGoogleSheet()
                }
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingSheet
                  ? 'Membuat...'
                  : 'Buat Google Sheet'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {record ? (
            <span
              className={
                record.status ===
                'PUBLISHED'
                  ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'
                  : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700'
              }
            >
              {record.status ===
              'PUBLISHED'
                ? 'Published'
                : 'Draft'}
            </span>
          ) : null}

          <button
            type="button"
            disabled={
              publishing || !record
            }
            onClick={() =>
              void changePublishStatus()
            }
            className={
              record?.status ===
              'PUBLISHED'
                ? 'rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                : 'rounded-lg border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50'
            }
            title={
              record
                ? undefined
                : 'Simpan draft terlebih dahulu'
            }
          >
            {publishing
              ? 'Memproses...'
              : record?.status ===
                  'PUBLISHED'
                ? 'Unpublish'
                : 'Publish'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveDraft()
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Menyimpan...'
              : 'Simpan Draft'}
          </button>

          <button
            type="button"
            onClick={() =>
              setPreviewOpen(true)
            }
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Preview
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-300 border-l-4 border-l-blue-600 bg-white shadow-sm">
        <div className="flex justify-center py-2">
          <span className="h-1 w-8 rounded-full bg-slate-300" />
        </div>

        <div className="space-y-4 px-6 pb-6">
          <RichTextEditor
            value={form.title}
            placeholder="Formulir tanpa judul"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                title: value,
              }))
            }
            className="border-b border-slate-300 pb-3 text-xl font-semibold text-slate-800 focus:border-blue-500"
          />

          <RichTextEditor
            value={form.description}
            placeholder="Deskripsi formulir"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                description: value,
              }))
            }
            className="min-h-24 border-b border-slate-200 py-2 text-sm leading-7 text-slate-700 focus:border-blue-500"
          />

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Slug tautan publik
            </span>

            <input
              value={slug}
              onChange={(event) =>
                setSlug(
                  normalizeSlug(
                    event.target.value,
                  ),
                )
              }
              placeholder="contoh-form-publik"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </label>

          {saveError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}

          {saveMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {saveMessage}
            </div>
          ) : null}
        </div>
      </div>

      {form.sections.map(
        (section, sectionIndex) => (
          <section
            key={section.id}
            onClick={() =>
              setActiveSectionId(
                section.id,
              )
            }
            className="space-y-3"
          >
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Bagian {sectionIndex + 1}
                  </p>

                  <RichTextEditor
                    value={section.title}
                    placeholder="Judul bagian"
                    onChange={(value) =>
                      updateSection(
                        section.id,
                        {
                          title: value,
                        },
                      )
                    }
                    className="border-b border-blue-200 pb-1 text-lg font-semibold focus:border-blue-500"
                  />

                  <RichTextEditor
                    value={
                      section.description
                    }
                    placeholder="Deskripsi bagian"
                    onChange={(value) =>
                      updateSection(
                        section.id,
                        {
                          description:
                            value,
                        },
                      )
                    }
                    className="border-b border-blue-100 pb-1 text-sm focus:border-blue-500"
                  />
                </div>

                {form.sections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      deleteSection(section.id)
                    }
                    className="text-sm text-red-600 hover:underline"
                  >
                    Hapus bagian
                  </button>
                ) : null}
              </div>
            </div>

            {section.questions.map(
              (question, questionIndex) => (
                <article
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="space-y-3">
                      <RichTextEditor
                        value={question.title}
                        placeholder={
                          question.type ===
                          'title_description'
                            ? 'Judul'
                            : `Pertanyaan ${questionIndex + 1}`
                        }
                        onChange={(value) =>
                          updateQuestion(
                            section.id,
                            question.id,
                            {
                              title: value,
                            },
                          )
                        }
                        className="border-b border-slate-300 pb-2 text-base font-medium focus:border-blue-500"
                      />

                      <RichTextEditor
                        value={
                          question.description
                        }
                        placeholder="Deskripsi pertanyaan (opsional)"
                        onChange={(value) =>
                          updateQuestion(
                            section.id,
                            question.id,
                            {
                              description:
                                value,
                            },
                          )
                        }
                        className="border-b border-slate-200 pb-2 text-sm focus:border-blue-500"
                      />
                    </div>

                    {question.type ===
                    'title_description' ? (
                      <div className="flex h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700">
                        Judul dan deskripsi
                      </div>
                    ) : (
                    <select
                      value={question.type}
                      onChange={(event) =>
                        changeQuestionType(
                          section.id,
                          question,
                          event.target
                            .value as QuestionType,
                        )
                      }
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                    >
                      {Object.entries(
                        questionTypeLabels,
                      ).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                    )}
                  </div>

                  <div className="mt-5">
                    {question.type ===
                    'title_description' ? null
                    : question.type ===
                    'short_text' ? (
                      <div className="w-1/2 border-b border-dashed border-slate-300 pb-1 text-sm text-slate-400">
                        Teks jawaban singkat
                      </div>
                    ) : question.type ===
                      'paragraph' ? (
                      <div className="w-full border-b border-dashed border-slate-300 pb-4 text-sm text-slate-400">
                        Teks jawaban panjang
                      </div>
                    ) : question.type ===
                        'single_choice' ||
                      question.type ===
                        'multiple_choice' ? (
                      <div className="space-y-2">
                        {question.options.map(
                          (option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="flex items-center gap-2"
                            >
                              <span className="text-slate-400">
                                {question.type ===
                                'single_choice'
                                  ? '○'
                                  : '□'}
                              </span>

                              <input
                                value={option}
                                onChange={(event) =>
                                  updateListValue(
                                    section.id,
                                    question,
                                    'options',
                                    optionIndex,
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder={`Opsi ${optionIndex + 1}`}
                                className="flex-1 border-b border-slate-200 py-1 text-sm outline-none focus:border-blue-500"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeListValue(
                                    section.id,
                                    question,
                                    'options',
                                    optionIndex,
                                  )
                                }
                                className="text-slate-400 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ),
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            addListValue(
                              section.id,
                              question,
                              'options',
                            )
                          }
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Tambah opsi
                        </button>
                      </div>
                    ) : question.type ===
                      'scale' ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="text-slate-500">
                            Nilai minimum
                          </span>

                          <select
                            value={
                              question.scaleMin
                            }
                            onChange={(event) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                {
                                  scaleMin:
                                    Number(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                          </select>

                          <input
                            value={
                              question.scaleMinLabel
                            }
                            onChange={(event) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                {
                                  scaleMinLabel:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            placeholder="Label minimum"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="text-slate-500">
                            Nilai maksimum
                          </span>

                          <select
                            value={
                              question.scaleMax
                            }
                            onChange={(event) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                {
                                  scaleMax:
                                    Number(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          >
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                              (value) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {value}
                                </option>
                              ),
                            )}
                          </select>

                          <input
                            value={
                              question.scaleMaxLabel
                            }
                            onChange={(event) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                {
                                  scaleMaxLabel:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            placeholder="Label maksimum"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">
                            Baris
                          </p>

                          {question.gridRows.map(
                            (row, rowIndex) => (
                              <div
                                key={rowIndex}
                                className="flex items-center gap-2"
                              >
                                <input
                                  value={row}
                                  onChange={(event) =>
                                    updateListValue(
                                      section.id,
                                      question,
                                      'gridRows',
                                      rowIndex,
                                      event.target
                                        .value,
                                    )
                                  }
                                  placeholder={`Baris ${rowIndex + 1}`}
                                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeListValue(
                                      section.id,
                                      question,
                                      'gridRows',
                                      rowIndex,
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            ),
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              addListValue(
                                section.id,
                                question,
                                'gridRows',
                              )
                            }
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Tambah baris
                          </button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">
                            Kolom
                          </p>

                          {question.options.map(
                            (column, columnIndex) => (
                              <div
                                key={columnIndex}
                                className="flex items-center gap-2"
                              >
                                <input
                                  value={column}
                                  onChange={(event) =>
                                    updateListValue(
                                      section.id,
                                      question,
                                      'options',
                                      columnIndex,
                                      event.target
                                        .value,
                                    )
                                  }
                                  placeholder={`Kolom ${columnIndex + 1}`}
                                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeListValue(
                                      section.id,
                                      question,
                                      'options',
                                      columnIndex,
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            ),
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              addListValue(
                                section.id,
                                question,
                                'options',
                              )
                            }
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Tambah kolom
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-4">
                    {question.type ===
                      'single_choice' ||
                    question.type ===
                      'multiple_choice' ? (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={
                            question.showOptionLabels ??
                            false
                          }
                          onChange={(event) =>
                            updateQuestion(
                              section.id,
                              question.id,
                              {
                                showOptionLabels:
                                  event.target
                                    .checked,
                              },
                            )
                          }
                        />

                        Gunakan label A, B, C, D
                      </label>
                    ) : null}

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) =>
                          updateQuestion(
                            section.id,
                            question.id,
                            {
                              required:
                                event.target.checked,
                            },
                          )
                        }
                      />

                      Wajib diisi
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        duplicateQuestion(
                          section.id,
                          question,
                        )
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Duplikasi
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteQuestion(
                          section.id,
                          question.id,
                        )
                      }
                      className="text-sm text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ),
            )}

            <button
              type="button"
              onClick={() =>
                addQuestion(section.id)
              }
              className="w-full rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              + Tambah pertanyaan
            </button>
          </section>
        ),
      )}

      <button
        type="button"
        onClick={addSection}
        className="w-full rounded-xl border border-dashed border-slate-400 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        + Tambah bagian
      </button>

      {previewOpen ? (
        <FormPreviewDialog
          form={form}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
