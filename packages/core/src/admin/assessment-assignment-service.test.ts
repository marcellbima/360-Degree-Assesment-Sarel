import { AppError } from '@sarel/shared';
import { describe, expect, it } from 'vitest';

import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type {
  AssessmentAssignmentFormVersionRef,
  AssessmentAssignmentGroupCreateResult,
  AssessmentAssignmentRepositoryPort,
  CreateAssessmentAssignmentGroupRepositoryInput,
} from '../ports/assessment-assignment-repository';
import type {
  AssessmentTypeRepositoryPort,
  AssessmentTypeRow,
} from '../ports/assessment-type-repository';
import type { AuditLogRepositoryPort, NewAuditLog } from '../ports/audit-log-repository';
import type { ClockPort } from '../ports/clock';
import type { ProgramRepositoryPort, ProgramRow } from '../ports/program-repository';
import {
  AssessmentAssignmentService,
  type CreateAssessmentAssignmentInput,
} from './assessment-assignment-service';
import { AdminAuditWriter } from './audit';
import type { AdminContext } from './types';

const NOW = '2026-07-20T00:00:00.000Z';

const ACTIVE_PROGRAM: ProgramRow = {
  id: 'program-1',
  code: 'PROGRAM_1',
  name: 'Program 1',
  description: null,
  year: 2026,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  organizationId: 'organization-1',
  status: 'ACTIVE',
  createdAt: NOW,
  updatedAt: NOW,
};

const FORM_VERSION: AssessmentAssignmentFormVersionRef = {
  id: 'version-1',
  publicFormId: 'form-1',
  versionNumber: 3,
};

const ASSESSMENT_TYPES: AssessmentTypeRow[] = [
  {
    id: 'ast_self',
    code: 'SELF',
    isSelf: true,
  },
  {
    id: 'ast_superior',
    code: 'SUPERIOR',
    isSelf: false,
  },
  {
    id: 'ast_peer',
    code: 'PEER',
    isSelf: false,
  },
  {
    id: 'ast_subordinate',
    code: 'SUBORDINATE',
    isSelf: false,
  },
];

const SUPERADMIN_CONTEXT: AdminContext = {
  actor: {
    id: 'admin-1',
    userId: 'superadmin',
    roles: ['SUPERADMIN'],
    permissions: [],
  },
  ip: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'request-1',
};

const ADMIN_CONTEXT: AdminContext = {
  actor: {
    id: 'admin-2',
    userId: 'admin',
    roles: ['ADMIN'],
    permissions: ['assessment.manage'],
  },
  ip: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'request-2',
};

interface ScopeRowInput {
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
}

interface HarnessOptions {
  program?: ProgramRow | null;
  formVersion?: AssessmentAssignmentFormVersionRef | null;
  assessmentTypes?: AssessmentTypeRow[];
  scopeRows?: ScopeRowInput[];
  createResult?: AssessmentAssignmentGroupCreateResult | null;
}

interface Harness {
  service: AssessmentAssignmentService;
  assignmentCalls: CreateAssessmentAssignmentGroupRepositoryInput[];
  auditRows: NewAuditLog[];
}

function createHarness(options: HarnessOptions = {}): Harness {
  const assignmentCalls: CreateAssessmentAssignmentGroupRepositoryInput[] = [];

  const auditRows: NewAuditLog[] = [];

  const clock: ClockPort = {
    now: () => new Date(NOW),
  };

  const assignments = {
    findPublicFormVersionById: async () =>
      options.formVersion === undefined ? FORM_VERSION : options.formVersion,

    listPublicFormVersions: async () => ({
      items: [],
      total: 0,
    }),

    listGroups: async () => ({
      items: [],
      total: 0,
    }),

    createGroup: async (input: CreateAssessmentAssignmentGroupRepositoryInput) => {
      assignmentCalls.push(input);

      if (options.createResult === null) {
        return null;
      }

      const defaultResult: AssessmentAssignmentGroupCreateResult = {
        groupId: input.group.id,
        selectedParticipantCount: 5,
        candidateAssignmentCount: 5,
        createdAssignmentCount: 4,
        skippedDuplicateCount: 1,
        skippedNoRelationCount: 0,
      };

      return {
        ...defaultResult,
        ...options.createResult,
        groupId: input.group.id,
      };
    },
  } as AssessmentAssignmentRepositoryPort;

  const programs = {
    findById: async () => (options.program === undefined ? ACTIVE_PROGRAM : options.program),
  } as unknown as ProgramRepositoryPort;

  const assessmentTypes = {
    list: async () => options.assessmentTypes ?? ASSESSMENT_TYPES,
  } as AssessmentTypeRepositoryPort;

  const scopes = {
    findByAdminUserId: async () => options.scopeRows ?? [],
  } as unknown as AdminScopeRepositoryPort;

  const auditLogs = {
    record: async (row: NewAuditLog) => {
      auditRows.push(row);
    },
  } as AuditLogRepositoryPort;

  const service = new AssessmentAssignmentService({
    assignments,
    programs,
    assessmentTypes,
    scopes,
    clock,
    audit: new AdminAuditWriter(auditLogs, clock),
  });

  return {
    service,
    assignmentCalls,
    auditRows,
  };
}

async function expectAppErrorCode(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;

    throw new Error('Operasi seharusnya gagal.');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);

    expect((error as AppError).code).toBe(expectedCode);
  }
}

describe('AssessmentAssignmentService', () => {
  it('membuat Assignment SELF dengan jadwal dan selection yang dinormalisasi', async () => {
    const harness = createHarness();

    const result = await harness.service.create(
      ' program-1 ',
      {
        name: '  Self Batch A  ',
        publicFormVersionId: ' version-1 ',
        assessmentType: 'SELF',
        selection: {
          mode: 'BATCHES',
          batchIds: ['batch-a', ' batch-a ', ''],
          includeWithoutBatch: true,
        },
        availableFrom: '2026-07-21T10:00:00+07:00',
        dueAt: '2026-07-22T10:00:00+07:00',
      },
      SUPERADMIN_CONTEXT,
    );

    expect(harness.assignmentCalls).toHaveLength(1);

    const call = harness.assignmentCalls[0];

    expect(call).toBeDefined();

    expect(call?.group).toMatchObject({
      programId: 'program-1',
      publicFormVersionId: 'version-1',
      assessmentTypeId: 'ast_self',
      name: 'Self Batch A',
      selectionMode: 'BATCHES',
      status: 'ACTIVE',
      availableFrom: '2026-07-21T03:00:00.000Z',
      dueAt: '2026-07-22T03:00:00.000Z',
      createdBy: 'admin-1',
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(call?.selection).toEqual({
      mode: 'BATCHES',
      batchIds: ['batch-a'],
      includeWithoutBatch: true,
    });

    expect(call?.isSelf).toBe(true);

    expect(call?.assessmentTypeCode).toBe('SELF');

    expect(call?.assignmentStatus).toBe('ASSIGNED');

    expect(result).toMatchObject({
      programId: 'program-1',
      publicFormId: 'form-1',
      publicFormVersionId: 'version-1',
      versionNumber: 3,
      assessmentType: 'SELF',
      name: 'Self Batch A',
      assignmentStatus: 'ASSIGNED',
      createdAssignmentCount: 4,
      skippedDuplicateCount: 1,
    });

    expect(harness.auditRows).toHaveLength(1);

    expect(harness.auditRows[0]).toMatchObject({
      actorId: 'admin-1',
      action: 'ASSESSMENT_ASSIGNMENT_GROUP_CREATED',
      entityType: 'assessment_assignment_group',
      entityId: result.groupId,
    });
  });

  it('menggunakan status AVAILABLE ketika waktu mulai tidak diisi', async () => {
    const harness = createHarness();

    const result = await harness.service.create(
      'program-1',
      {
        name: 'Self Semua Peserta',
        publicFormVersionId: 'version-1',
        assessmentType: 'SELF',
        selection: {
          mode: 'ALL_ACTIVE',
        },
      },
      SUPERADMIN_CONTEXT,
    );

    expect(result.assignmentStatus).toBe('AVAILABLE');

    expect(result.availableFrom).toBeNull();

    expect(harness.assignmentCalls[0]?.assignmentStatus).toBe('AVAILABLE');
  });

  it('membentuk Assignment OTHER menggunakan relation', async () => {
    const harness = createHarness({
      createResult: {
        groupId: 'ignored',
        selectedParticipantCount: 35,
        candidateAssignmentCount: 2,
        createdAssignmentCount: 2,
        skippedDuplicateCount: 0,
        skippedNoRelationCount: 33,
      },
    });

    const result = await harness.service.create(
      'program-1',
      {
        name: 'Penilaian Atasan',
        publicFormVersionId: 'version-1',
        assessmentType: 'SUPERIOR',
        selection: {
          mode: 'ALL_ACTIVE',
        },
      },
      SUPERADMIN_CONTEXT,
    );

    const call = harness.assignmentCalls[0];

    expect(call?.assessmentTypeCode).toBe('SUPERIOR');

    expect(call?.isSelf).toBe(false);

    expect(call?.group.assessmentTypeId).toBe('ast_superior');

    expect(result).toMatchObject({
      assessmentType: 'SUPERIOR',
      selectedParticipantCount: 35,
      candidateAssignmentCount: 2,
      createdAssignmentCount: 2,
      skippedNoRelationCount: 33,
    });
  });

  it('menolak batas waktu yang tidak setelah waktu mulai', async () => {
    const harness = createHarness();

    await expectAppErrorCode(
      harness.service.create(
        'program-1',
        {
          name: 'Assignment Invalid',
          publicFormVersionId: 'version-1',
          assessmentType: 'SELF',
          selection: {
            mode: 'ALL_ACTIVE',
          },
          availableFrom: '2026-07-22T10:00:00Z',
          dueAt: '2026-07-22T10:00:00Z',
        },
        SUPERADMIN_CONTEXT,
      ),
      'VALIDATION_ERROR',
    );

    expect(harness.assignmentCalls).toHaveLength(0);

    expect(harness.auditRows).toHaveLength(0);
  });

  it('menolak selection peserta yang kosong', async () => {
    const harness = createHarness();

    const input: CreateAssessmentAssignmentInput = {
      name: 'Assignment Kosong',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'PARTICIPANTS',
        participantIds: [' ', ''],
      },
    };

    await expectAppErrorCode(
      harness.service.create('program-1', input, SUPERADMIN_CONTEXT),
      'VALIDATION_ERROR',
    );

    expect(harness.assignmentCalls).toHaveLength(0);
  });

  it('menolak program yang tidak aktif', async () => {
    const harness = createHarness({
      program: {
        ...ACTIVE_PROGRAM,
        status: 'ARCHIVED',
      },
    });

    await expectAppErrorCode(
      harness.service.create(
        'program-1',
        {
          name: 'Assignment Archived',
          publicFormVersionId: 'version-1',
          assessmentType: 'SELF',
          selection: {
            mode: 'ALL_ACTIVE',
          },
        },
        SUPERADMIN_CONTEXT,
      ),
      'CONFLICT',
    );

    expect(harness.assignmentCalls).toHaveLength(0);
  });

  it('menolak program di luar scope ADMIN', async () => {
    const harness = createHarness({
      scopeRows: [
        {
          programId: 'program-lain',
          batchId: null,
          organizationId: null,
        },
      ],
    });

    await expectAppErrorCode(
      harness.service.create(
        'program-1',
        {
          name: 'Assignment Outside Scope',
          publicFormVersionId: 'version-1',
          assessmentType: 'SELF',
          selection: {
            mode: 'ALL_ACTIVE',
          },
        },
        ADMIN_CONTEXT,
      ),
      'FORBIDDEN',
    );

    expect(harness.assignmentCalls).toHaveLength(0);
  });

  it('menolak konfigurasi SELF yang tidak konsisten', async () => {
    const harness = createHarness({
      assessmentTypes: [
        {
          id: 'ast_self',
          code: 'SELF',
          isSelf: false,
        },
      ],
    });

    await expectAppErrorCode(
      harness.service.create(
        'program-1',
        {
          name: 'Assignment Invalid Type',
          publicFormVersionId: 'version-1',
          assessmentType: 'SELF',
          selection: {
            mode: 'ALL_ACTIVE',
          },
        },
        SUPERADMIN_CONTEXT,
      ),
      'INTERNAL_ERROR',
    );

    expect(harness.assignmentCalls).toHaveLength(0);
  });

  it('tidak mencatat audit ketika repository tidak membuat Assignment', async () => {
    const harness = createHarness({
      createResult: null,
    });

    await expectAppErrorCode(
      harness.service.create(
        'program-1',
        {
          name: 'Assignment Duplikat',
          publicFormVersionId: 'version-1',
          assessmentType: 'SELF',
          selection: {
            mode: 'ALL_ACTIVE',
          },
        },
        SUPERADMIN_CONTEXT,
      ),
      'CONFLICT',
    );

    expect(harness.assignmentCalls).toHaveLength(1);

    expect(harness.auditRows).toHaveLength(0);
  });
});
