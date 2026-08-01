import { describe, expect, it } from 'vitest';

import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type {
  AssessmentAssignmentFormVersionListFilter,
  AssessmentAssignmentFormVersionListItem,
  AssessmentAssignmentGroupListFilter,
  AssessmentAssignmentGroupListItem,
  AssessmentAssignmentRepositoryPort,
  CreateAssessmentAssignmentGroupRepositoryInput,
} from '../ports/assessment-assignment-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import type { AuditLogRepositoryPort, NewAuditLog } from '../ports/audit-log-repository';
import type { ClockPort } from '../ports/clock';
import type { ProgramRepositoryPort, ProgramRow } from '../ports/program-repository';
import { AssessmentAssignmentService } from './assessment-assignment-service';
import { AdminAuditWriter } from './audit';
import type { AdminContext } from './types';

const NOW = '2026-07-20T00:00:00.000Z';

const PROGRAM: ProgramRow = {
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

const FORM_VERSION: AssessmentAssignmentFormVersionListItem = {
  id: 'version-2',
  publicFormId: 'form-1',
  formSlug: 'form-satu',
  formTitle: 'Form Satu',
  formDescription: null,
  versionNumber: 2,
  publishedAt: NOW,
  sectionCount: 2,
  questionCount: 10,
};

const GROUP: AssessmentAssignmentGroupListItem = {
  id: 'group-1',
  programId: 'program-1',
  publicFormId: 'form-1',
  publicFormVersionId: 'version-2',
  formSlug: 'form-satu',
  formTitle: 'Form Satu',
  versionNumber: 2,
  assessmentType: 'SELF',
  name: 'SELF Semua Peserta',
  selectionMode: 'ALL_ACTIVE',
  selection: {
    mode: 'ALL_ACTIVE',
  },
  selectedParticipantCount: 35,
  candidateAssignmentCount: 35,
  createdAssignmentCount: 35,
  skippedDuplicateCount: 0,
  skippedNoRelationCount: 0,
  status: 'ACTIVE',
  availableFrom: null,
  dueAt: null,
  createdAt: NOW,
};

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
    permissions: ['assessment.read'],
  },
  ip: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'request-2',
};

interface HarnessOptions {
  program?: ProgramRow | null;
  scopeProgramId?: string | null;
}

function createHarness(options: HarnessOptions = {}) {
  let versionFilter: AssessmentAssignmentFormVersionListFilter | null = null;

  let groupFilter: AssessmentAssignmentGroupListFilter | null = null;

  const assignments: AssessmentAssignmentRepositoryPort = {
    findPublicFormVersionById: async () => null,

    listPublicFormVersions: async (filter) => {
      versionFilter = filter;

      return {
        items: [FORM_VERSION],
        total: 1,
      };
    },

    listGroups: async (filter) => {
      groupFilter = filter;

      return {
        items: [GROUP],
        total: 1,
      };
    },

    createGroup: async (_input: CreateAssessmentAssignmentGroupRepositoryInput) => null,
  };

  const programs = {
    findById: async () => (options.program === undefined ? PROGRAM : options.program),
  } as unknown as ProgramRepositoryPort;

  const assessmentTypes = {
    list: async () => [],
  } as AssessmentTypeRepositoryPort;

  const scopes = {
    findByAdminUserId: async () =>
      options.scopeProgramId === undefined
        ? []
        : [
            {
              id: 'scope-1',
              adminUserId: 'admin-2',
              programId: options.scopeProgramId,
              batchId: null,
              organizationId: null,
            },
          ],
  } as unknown as AdminScopeRepositoryPort;

  const clock: ClockPort = {
    now: () => new Date(NOW),
  };

  const auditRows: NewAuditLog[] = [];

  const auditRepository = {
    record: async (row: NewAuditLog) => {
      auditRows.push(row);
    },
  } as AuditLogRepositoryPort;

  return {
    service: new AssessmentAssignmentService({
      assignments,
      programs,
      assessmentTypes,
      scopes,
      clock,
      audit: new AdminAuditWriter(auditRepository, clock),
    }),
    getVersionFilter: () => versionFilter,
    getGroupFilter: () => groupFilter,
  };
}

describe('AssessmentAssignmentService read operations', () => {
  it('membuat pagination dan filter daftar versi form', async () => {
    const harness = createHarness();

    const result = await harness.service.listFormVersions({
      page: 2,
      pageSize: 10,
      search: '  Form Satu  ',
    });

    expect(harness.getVersionFilter()).toEqual({
      search: 'Form Satu',
      limit: 10,
      offset: 10,
    });

    expect(result).toMatchObject({
      items: [FORM_VERSION],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it('menampilkan assignment group untuk program yang dapat diakses', async () => {
    const harness = createHarness();

    const result = await harness.service.listGroups(
      ' program-1 ',
      {
        page: 1,
        pageSize: 20,
        search: '  SELF  ',
      },
      SUPERADMIN_CONTEXT,
    );

    expect(harness.getGroupFilter()).toEqual({
      programId: 'program-1',
      search: 'SELF',
      limit: 20,
      offset: 0,
    });

    expect(result).toMatchObject({
      items: [GROUP],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('menolak daftar group program di luar scope ADMIN', async () => {
    const harness = createHarness({
      scopeProgramId: 'program-lain',
    });

    await expect(
      harness.service.listGroups(
        'program-1',
        {
          page: 1,
          pageSize: 20,
        },
        ADMIN_CONTEXT,
      ),
    ).rejects.toMatchObject({
      httpStatus: 403,
    });

    expect(harness.getGroupFilter()).toBeNull();
  });

  it('mengembalikan 404 ketika program daftar group tidak ditemukan', async () => {
    const harness = createHarness({
      program: null,
    });

    await expect(
      harness.service.listGroups(
        'program-1',
        {
          page: 1,
          pageSize: 20,
        },
        SUPERADMIN_CONTEXT,
      ),
    ).rejects.toMatchObject({
      httpStatus: 404,
    });
  });
});
