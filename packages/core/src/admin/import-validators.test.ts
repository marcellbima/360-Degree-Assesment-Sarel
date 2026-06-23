import { describe, expect, it } from 'vitest';
import {
  classifyEvaluatorRows,
  classifyParticipantRows,
  summarize,
} from './import-validators';

describe('classifyParticipantRows', () => {
  const lookups = {
    usersByCode: new Map([['U1', { id: 'user_1', userCode: 'U1', fullName: 'A' }]]),
    batchIdByCode: new Map([['B1', 'batch_1']]),
    activeParticipantUserIds: new Set<string>(),
    scope: { kind: 'all' } as const,
    programId: 'prog_1',
    programOrganizationId: null,
  };

  it('VALID untuk user + batch dikenal', () => {
    const r = classifyParticipantRows([{ rowNumber: 2, userId: 'U1', batchCode: 'B1' }], lookups);
    expect(r[0].status).toBe('VALID');
    expect(r[0].normalized).toEqual({ userDbId: 'user_1', batchId: 'batch_1' });
  });

  it('unknown user ERROR, unknown batch ERROR', () => {
    expect(classifyParticipantRows([{ rowNumber: 2, userId: 'X', batchCode: 'B1' }], lookups)[0].status).toBe('ERROR');
    expect(classifyParticipantRows([{ rowNumber: 2, userId: 'U1', batchCode: 'X' }], lookups)[0].status).toBe('ERROR');
  });

  it('participant aktif -> SKIPPED', () => {
    const r = classifyParticipantRows([{ rowNumber: 2, userId: 'U1', batchCode: 'B1' }], {
      ...lookups,
      activeParticipantUserIds: new Set(['user_1']),
    });
    expect(r[0].status).toBe('SKIPPED');
  });

  it('duplicate dalam file -> SKIPPED deterministik', () => {
    const r = classifyParticipantRows(
      [
        { rowNumber: 2, userId: 'U1', batchCode: 'B1' },
        { rowNumber: 3, userId: 'U1', batchCode: 'B1' },
      ],
      lookups,
    );
    expect(r[0].status).toBe('VALID');
    expect(r[1].status).toBe('SKIPPED');
  });

  it('batch di luar scope administratif -> ERROR', () => {
    const r = classifyParticipantRows([{ rowNumber: 2, userId: 'U1', batchCode: 'B1' }], {
      ...lookups,
      scope: { kind: 'scoped', rows: [{ programId: 'prog_1', batchId: 'batch_other', organizationId: null }] },
    });
    expect(r[0].status).toBe('ERROR');
    expect(r[0].message).toMatch(/scope/i);
  });

  it('batch dalam scope administratif -> VALID', () => {
    const r = classifyParticipantRows([{ rowNumber: 2, userId: 'U1', batchCode: 'B1' }], {
      ...lookups,
      scope: { kind: 'scoped', rows: [{ programId: 'prog_1', batchId: 'batch_1', organizationId: null }] },
    });
    expect(r[0].status).toBe('VALID');
  });
});

describe('classifyEvaluatorRows', () => {
  const lookups = {
    participantsByUserCode: new Map([
      ['U1', { participantId: 'pp_1', userId: 'user_1', userCode: 'U1', batchId: 'batch_1', organizationId: null }],
      ['U2', { participantId: 'pp_2', userId: 'user_2', userCode: 'U2', batchId: 'batch_1', organizationId: null }],
    ]),
    activeRelationKeys: new Set<string>(),
    typeIdByCode: new Map([
      ['SUPERIOR', 'atype_superior'],
      ['PEER', 'atype_peer'],
      ['SUBORDINATE', 'atype_subordinate'],
    ]),
    scope: { kind: 'all' } as const,
    programId: 'prog_1',
  };

  it('VALID untuk subject + evaluator participant', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'PEER' }],
      lookups,
    );
    expect(r[0].status).toBe('VALID');
    expect(r[0].normalized).toEqual({
      subjectParticipantId: 'pp_1',
      evaluatorUserId: 'user_2',
      assessmentTypeId: 'atype_peer',
    });
  });

  it('SELF ditolak ERROR', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'SELF' }],
      lookups,
    );
    expect(r[0].status).toBe('ERROR');
  });

  it('subject == evaluator ERROR', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U1', assessmentType: 'PEER' }],
      lookups,
    );
    expect(r[0].status).toBe('ERROR');
  });

  it('relation aktif -> SKIPPED', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'PEER' }],
      { ...lookups, activeRelationKeys: new Set(['pp_1|user_2|atype_peer']) },
    );
    expect(r[0].status).toBe('SKIPPED');
  });

  it('hanya subject dalam scope (evaluator di luar) -> ERROR', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'PEER' }],
      {
        ...lookups,
        participantsByUserCode: new Map([
          ['U1', { participantId: 'pp_1', userId: 'user_1', userCode: 'U1', batchId: 'batch_1', organizationId: null }],
          ['U2', { participantId: 'pp_2', userId: 'user_2', userCode: 'U2', batchId: 'batch_2', organizationId: null }],
        ]),
        scope: { kind: 'scoped', rows: [{ programId: 'prog_1', batchId: 'batch_1', organizationId: null }] },
      },
    );
    expect(r[0].status).toBe('ERROR');
    expect(r[0].message).toMatch(/scope/i);
  });

  it('dua batch scope terpisah mencakup subject dan evaluator (OR antar-scope) -> VALID', () => {
    const r = classifyEvaluatorRows(
      [{ rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'PEER' }],
      {
        ...lookups,
        participantsByUserCode: new Map([
          ['U1', { participantId: 'pp_1', userId: 'user_1', userCode: 'U1', batchId: 'batch_1', organizationId: null }],
          ['U2', { participantId: 'pp_2', userId: 'user_2', userCode: 'U2', batchId: 'batch_2', organizationId: null }],
        ]),
        scope: {
          kind: 'scoped',
          rows: [
            { programId: 'prog_1', batchId: 'batch_1', organizationId: null },
            { programId: 'prog_1', batchId: 'batch_2', organizationId: null },
          ],
        },
      },
    );
    expect(r[0].status).toBe('VALID');
  });

  it('summarize menghitung valid/skipped/error', () => {
    const rows = classifyEvaluatorRows(
      [
        { rowNumber: 2, subjectUserId: 'U1', evaluatorUserId: 'U2', assessmentType: 'PEER' },
        { rowNumber: 3, subjectUserId: 'U1', evaluatorUserId: 'U1', assessmentType: 'PEER' },
      ],
      lookups,
    );
    const s = summarize(rows);
    expect(s.valid).toBe(1);
    expect(s.error).toBe(1);
    expect(s.total).toBe(2);
  });
});
