import { describe, expect, it } from 'vitest';

import { createAssessmentAssignmentSchema } from './assessment-assignment';

describe('createAssessmentAssignmentSchema', () => {
  it('menerima Assignment SELF untuk seluruh peserta aktif', () => {
    const result = createAssessmentAssignmentSchema.parse({
      name: '  Self Assessment  ',
      publicFormVersionId: ' version-1 ',
      assessmentType: 'SELF',
      selection: {
        mode: 'ALL_ACTIVE',
      },
      availableFrom: null,
      dueAt: null,
    });

    expect(result.name).toBe('Self Assessment');

    expect(result.publicFormVersionId).toBe('version-1');

    expect(result.selection).toEqual({
      mode: 'ALL_ACTIVE',
    });
  });

  it('menerima pilihan batch yang valid', () => {
    const result = createAssessmentAssignmentSchema.parse({
      name: 'Penilaian Atasan',
      publicFormVersionId: 'version-1',
      assessmentType: 'SUPERIOR',
      selection: {
        mode: 'BATCHES',
        batchIds: [' batch-a '],
        includeWithoutBatch: true,
      },
    });

    expect(result.selection).toEqual({
      mode: 'BATCHES',
      batchIds: ['batch-a'],
      includeWithoutBatch: true,
    });
  });

  it('menolak pilihan batch kosong tanpa peserta tanpa batch', () => {
    const result = createAssessmentAssignmentSchema.safeParse({
      name: 'Assignment Batch',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'BATCHES',
        batchIds: [],
        includeWithoutBatch: false,
      },
    });

    expect(result.success).toBe(false);
  });

  it('menolak pilihan peserta kosong', () => {
    const result = createAssessmentAssignmentSchema.safeParse({
      name: 'Assignment Peserta',
      publicFormVersionId: 'version-1',
      assessmentType: 'PEER',
      selection: {
        mode: 'PARTICIPANTS',
        participantIds: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it('menolak format tanggal yang tidak valid', () => {
    const result = createAssessmentAssignmentSchema.safeParse({
      name: 'Assignment Invalid',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'ALL_ACTIVE',
      },
      availableFrom: 'bukan-tanggal',
    });

    expect(result.success).toBe(false);
  });

  it('menolak batas waktu yang tidak setelah waktu mulai', () => {
    const result = createAssessmentAssignmentSchema.safeParse({
      name: 'Assignment Invalid',
      publicFormVersionId: 'version-1',
      assessmentType: 'SUBORDINATE',
      selection: {
        mode: 'ALL_ACTIVE',
      },
      availableFrom: '2026-07-24T10:00:00Z',
      dueAt: '2026-07-24T10:00:00Z',
    });

    expect(result.success).toBe(false);
  });

  it('menerima batas waktu setelah waktu mulai', () => {
    const result = createAssessmentAssignmentSchema.safeParse({
      name: 'Assignment Terjadwal',
      publicFormVersionId: 'version-1',
      assessmentType: 'PEER',
      selection: {
        mode: 'PARTICIPANTS',
        participantIds: ['participant-1'],
      },
      availableFrom: '2026-07-24T10:00:00+07:00',
      dueAt: '2026-07-25T10:00:00+07:00',
    });

    expect(result.success).toBe(true);
  });
});
