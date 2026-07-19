import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  EvaluatorRelationDto,
  ParticipantDto,
} from '@sarel/shared';

import {
  ApiError,
  adminApi,
} from '../../lib/api';
import {
  useAuth,
} from '../../auth/AuthContext';

const TYPE_OPTIONS = [
  {
    value: 'SUPERIOR',
    label: 'Atasan',
  },
  {
    value: 'PEER',
    label: 'Rekan Kerja',
  },
  {
    value: 'SUBORDINATE',
    label: 'Bawahan',
  },
];

function typeLabel(
  value: string,
): string {
  return (
    TYPE_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

const NO_BATCH_FILTER =
  '__NO_BATCH__';

function formatBatch(
  batchCode: string | null,
): string {
  return batchCode
    ? `Batch ${batchCode}`
    : 'Tanpa Batch';
}

export function EvaluatorRelationsPage({
  programId,
}: {
  programId: string;
}): JSX.Element {
  const {
    user,
  } =
    useAuth();

  const canManage =
    user?.permissions.includes(
      'evaluator.manage',
    ) ?? false;

  const [
    participants,
    setParticipants,
  ] =
    useState<ParticipantDto[]>([]);

  const [
    relations,
    setRelations,
  ] =
    useState<
      EvaluatorRelationDto[]
    >([]);

  const [
    selectedEvaluatorId,
    setSelectedEvaluatorId,
  ] =
    useState('');

  const [
    subjectSearch,
    setSubjectSearch,
  ] =
    useState('');

  const [
    batchFilter,
    setBatchFilter,
  ] =
    useState('');

  const [
    selections,
    setSelections,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    reloadKey,
    setReloadKey,
  ] =
    useState(0);

  const reload =
    useCallback(
      () =>
        setReloadKey(
          (value) =>
            value + 1,
        ),
      [],
    );

  useEffect(() => {
    if (!programId) {
      return;
    }

    let active = true;

    setLoading(true);
    setLoadError(null);

    Promise.all([
      adminApi.participants.list(
        programId,
        {
          page: 1,
          pageSize: 100,
          status: 'ACTIVE',
        },
      ),

      adminApi.relations.list(
        programId,
        {
          page: 1,
          pageSize: 100,
          status: 'ACTIVE',
        },
      ),
    ])
      .then(
        ([
          participantResult,
          relationResult,
        ]) => {
          if (!active) {
            return;
          }

          setParticipants(
            participantResult.items,
          );

          setRelations(
            relationResult.items,
          );
        },
      )
      .catch(
        (caught: unknown) => {
          if (!active) {
            return;
          }

          setLoadError(
            caught instanceof ApiError
              ? caught.message
              : 'Data relasi penilai gagal dimuat.',
          );
        },
      )
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    programId,
    reloadKey,
  ]);

  const selectedEvaluator =
    useMemo(
      () =>
        participants.find(
          (participant) =>
            participant.id ===
            selectedEvaluatorId,
        ) ?? null,
      [
        participants,
        selectedEvaluatorId,
      ],
    );

  const evaluatorRelations =
    useMemo(
      () =>
        relations.filter(
          (relation) =>
            relation.status ===
              'ACTIVE' &&
            relation
              .evaluatorParticipantId ===
              selectedEvaluatorId,
        ),
      [
        relations,
        selectedEvaluatorId,
      ],
    );

  useEffect(() => {
    const nextSelections:
      Record<string, string> =
      {};

    for (
      const relation
      of evaluatorRelations
    ) {
      nextSelections[
        relation
          .subjectParticipantId
      ] =
        relation.assessmentType;
    }

    setSelections(
      nextSelections,
    );

    setActionError(null);
    setMessage(null);
  }, [
    evaluatorRelations,
  ]);

  const batches =
    useMemo(
      () =>
        Array.from(
          new Set(
            participants
              .map(
                (participant) =>
                  participant.batchCode,
              )
              .filter(
                (batch): batch is string =>
                  batch !== null,
              ),
          ),
        ).sort(),
      [
        participants,
      ],
    );
  const hasParticipantsWithoutBatch =
    useMemo(
      () =>
        participants.some(
          (participant) =>
            participant.batchCode ===
            null,
        ),
      [participants],
    );


  const filteredSubjects =
    useMemo(() => {
      const normalizedSearch =
        subjectSearch
          .trim()
          .toLocaleLowerCase(
            'id-ID',
          );

      return participants.filter(
        (participant) => {
          if (
            participant.id ===
            selectedEvaluatorId
          ) {
            return false;
          }

          if (
            batchFilter ===
              NO_BATCH_FILTER &&
            participant.batchCode !==
              null
          ) {
            return false;
          }

          if (
            batchFilter &&
            batchFilter !==
              NO_BATCH_FILTER &&
            participant.batchCode !==
              batchFilter
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          return (
            participant.userCode
              .toLocaleLowerCase(
                'id-ID',
              )
              .includes(
                normalizedSearch,
              ) ||
            participant.fullName
              .toLocaleLowerCase(
                'id-ID',
              )
              .includes(
                normalizedSearch,
              )
          );
        },
      );
    }, [
      participants,
      selectedEvaluatorId,
      batchFilter,
      subjectSearch,
    ]);

  const relationGroups =
    useMemo(
      () =>
        participants
          .map(
            (participant) => {
              const assigned =
                relations.filter(
                  (relation) =>
                    relation.status ===
                      'ACTIVE' &&
                    relation
                      .evaluatorParticipantId ===
                      participant.id,
                );

              return {
                participant,
                assigned,
              };
            },
          )
          .filter(
            (group) =>
              group.assigned.length >
              0,
          )
          .sort((left, right) =>
            left.participant.fullName
              .localeCompare(
                right.participant
                  .fullName,
                'id-ID',
              ),
          ),
      [
        participants,
        relations,
      ],
    );

  function chooseEvaluator(
    evaluatorId: string,
  ): void {
    setSelectedEvaluatorId(
      evaluatorId,
    );

    setSubjectSearch('');
    setBatchFilter('');
    setActionError(null);
    setMessage(null);
  }

  function toggleSubject(
    participantId: string,
    checked: boolean,
  ): void {
    setSelections(
      (current) => {
        const next = {
          ...current,
        };

        if (checked) {
          next[participantId] =
            current[
              participantId
            ] ?? 'PEER';
        } else {
          delete next[
            participantId
          ];
        }

        return next;
      },
    );
  }

  function setRelationType(
    participantId: string,
    assessmentType: string,
  ): void {
    setSelections(
      (current) => ({
        ...current,
        [participantId]:
          assessmentType,
      }),
    );
  }

  function selectVisible(): void {
    setSelections(
      (current) => {
        const next = {
          ...current,
        };

        for (
          const participant
          of filteredSubjects
        ) {
          next[
            participant.id
          ] ??= 'PEER';
        }

        return next;
      },
    );
  }

  function clearVisible(): void {
    setSelections(
      (current) => {
        const next = {
          ...current,
        };

        for (
          const participant
          of filteredSubjects
        ) {
          delete next[
            participant.id
          ];
        }

        return next;
      },
    );
  }

  async function saveRelations():
  Promise<void> {
    if (
      !selectedEvaluatorId
    ) {
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    const existingBySubject =
      new Map(
        evaluatorRelations.map(
          (relation) => [
            relation
              .subjectParticipantId,
            relation,
          ],
        ),
      );

    const archiveFailed =
      new Set<string>();

    const archivedForChange =
      new Map<
        string,
        EvaluatorRelationDto
      >();

    let archivedCount = 0;
    let createdCount = 0;
    let unchangedCount = 0;

    const errors: string[] =
      [];

    for (
      const [
        subjectParticipantId,
        relation,
      ]
      of existingBySubject
    ) {
      const desiredType =
        selections[
          subjectParticipantId
        ];

      if (
        desiredType ===
        relation.assessmentType
      ) {
        unchangedCount += 1;
        continue;
      }

      try {
        await adminApi.relations
          .archive(
            relation.id,
          );

        archivedCount += 1;

        if (desiredType) {
          archivedForChange.set(
            subjectParticipantId,
            relation,
          );
        }
      } catch (caught) {
        archiveFailed.add(
          subjectParticipantId,
        );

        errors.push(
          caught instanceof ApiError
            ? caught.message
            : 'Relasi lama gagal diarsipkan.',
        );
      }
    }

    for (
      const [
        subjectParticipantId,
        assessmentType,
      ]
      of Object.entries(
        selections,
      )
    ) {
      const existing =
        existingBySubject.get(
          subjectParticipantId,
        );

      if (
        existing?.assessmentType ===
        assessmentType
      ) {
        continue;
      }

      if (
        archiveFailed.has(
          subjectParticipantId,
        )
      ) {
        continue;
      }

      try {
        await adminApi.relations
          .create(
            programId,
            {
              subjectParticipantId,
              evaluatorParticipantId:
                selectedEvaluatorId,
              assessmentType,
            },
          );

        createdCount += 1;
      } catch (caught) {
        const oldRelation =
          archivedForChange.get(
            subjectParticipantId,
          );

        if (oldRelation) {
          try {
            await adminApi.relations
              .activate(
                oldRelation.id,
              );
          } catch {
            errors.push(
              'Relasi lama gagal dipulihkan.',
            );
          }
        }

        errors.push(
          caught instanceof ApiError
            ? caught.message
            : 'Relasi baru gagal disimpan.',
        );
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      setActionError(
        `${errors.length} operasi gagal. ${errors[0]}`,
      );
    }

    setMessage(
      [
        `${createdCount} relasi disimpan`,
        `${archivedCount} relasi diarsipkan`,
        `${unchangedCount} relasi tidak berubah`,
      ].join(' • '),
    );

    reload();
  }

  const selectedCount =
    Object.keys(
      selections,
    ).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Relasi Penilai
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Pilih satu penilai, lalu tentukan semua peserta yang akan dinilai.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Pilih Penilai
            </label>

            <select
              value={
                selectedEvaluatorId
              }
              onChange={(event) =>
                chooseEvaluator(
                  event.target.value,
                )
              }
              disabled={
                loading
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                Pilih nama penilai...
              </option>

              {participants.map(
                (participant) => (
                  <option
                    key={
                      participant.id
                    }
                    value={
                      participant.id
                    }
                  >
                    {
                      participant.userCode
                    }
                    {' — '}
                    {
                      participant.fullName
                    }
                    {' — '}
                    {
                      formatBatch(
                        participant.batchCode,
                      )
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">
            Dipilih:{' '}
            <strong>
              {selectedCount}
            </strong>{' '}
            peserta
          </div>
        </div>

        {selectedEvaluator ? (
          <>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                Penilai
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {
                  selectedEvaluator.fullName
                }
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {
                  selectedEvaluator.userCode
                }
                {' • '}
                {
                  formatBatch(
                    selectedEvaluator.batchCode,
                  )
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={
                  subjectSearch
                }
                onChange={(event) =>
                  setSubjectSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari peserta..."
                className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <select
                value={
                  batchFilter
                }
                onChange={(event) =>
                  setBatchFilter(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">
                  Semua Batch
                </option>

                {batches.map(
                  (batch) => (
                    <option
                      key={batch}
                      value={batch}
                    >
                      Batch {batch}
                    </option>
                  ),
                )}

                {hasParticipantsWithoutBatch ? (
                  <option
                    value={
                      NO_BATCH_FILTER
                    }
                  >
                    Tanpa Batch
                  </option>
                ) : null}
              </select>

              <button
                type="button"
                onClick={
                  selectVisible
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Pilih yang tampil
              </button>

              <button
                type="button"
                onClick={
                  clearVisible
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Hapus pilihan
              </button>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="w-12 px-3 py-2" />

                    <th className="px-3 py-2 font-medium">
                      Peserta yang Dinilai
                    </th>

                    <th className="px-3 py-2 font-medium">
                      Batch
                    </th>

                    <th className="min-w-44 px-3 py-2 font-medium">
                      Hubungan Penilai
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubjects.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-5 text-center text-slate-400"
                      >
                        Tidak ada peserta yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map(
                      (
                        participant,
                      ) => {
                        const selected =
                          participant.id in
                          selections;

                        return (
                          <tr
                            key={
                              participant.id
                            }
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={(
                                  event,
                                ) =>
                                  toggleSubject(
                                    participant.id,
                                    event.target
                                      .checked,
                                  )
                                }
                              />
                            </td>

                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-800">
                                {
                                  participant.fullName
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  participant.userCode
                                }
                              </p>
                            </td>

                            <td className="px-3 py-2 text-slate-600">
                              {
                                participant.batchCode ??
                                  'Tanpa Batch'
                              }
                            </td>

                            <td className="px-3 py-2">
                              <select
                                value={
                                  selections[
                                    participant.id
                                  ] ?? 'PEER'
                                }
                                disabled={
                                  !selected
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setRelationType(
                                    participant.id,
                                    event.target
                                      .value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {TYPE_OPTIONS.map(
                                  (
                                    option,
                                  ) => (
                                    <option
                                      key={
                                        option.value
                                      }
                                      value={
                                        option.value
                                      }
                                    >
                                      {
                                        option.label
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>

            {actionError ? (
              <p className="text-sm text-red-600">
                {actionError}
              </p>
            ) : null}

            {message ? (
              <p className="text-sm text-green-700">
                {message}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={
                  !canManage ||
                  saving
                }
                onClick={() =>
                  void saveRelations()
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? 'Menyimpan...'
                  : 'Simpan Relasi'}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Pilih nama penilai untuk mulai mengatur relasi.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="font-semibold text-slate-800">
            Ringkasan Penilai
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Penilai yang sudah memiliki peserta untuk dinilai.
          </p>
        </div>

        {relationGroups.length ===
        0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Belum ada relasi penilai aktif.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {relationGroups.map(
              ({
                participant,
                assigned,
              }) => (
                <button
                  key={
                    participant.id
                  }
                  type="button"
                  onClick={() =>
                    chooseEvaluator(
                      participant.id,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {
                          participant.fullName
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          participant.userCode
                        }
                        {' • '}
                        {
                          formatBatch(
                            participant.batchCode,
                          )
                        }
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {
                        assigned.length
                      }{' '}
                      peserta
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map(
                      (option) => {
                        const count =
                          assigned.filter(
                            (relation) =>
                              relation
                                .assessmentType ===
                              option.value,
                          ).length;

                        return count >
                          0 ? (
                          <span
                            key={
                              option.value
                            }
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                          >
                            {typeLabel(
                              option.value,
                            )}
                            : {count}
                          </span>
                        ) : null;
                      },
                    )}
                  </div>

                  <p className="mt-3 text-sm font-medium text-blue-600">
                    Atur relasi →
                  </p>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
