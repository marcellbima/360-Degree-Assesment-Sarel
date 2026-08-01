import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AssessmentAssignmentService, AuthPrincipal } from '@sarel/core';

import { formatError } from '../errors';
import type { ApiEnv } from '../middleware/types';
import { assessmentAssignmentRoutes } from '../routes/admin/assessment-assignments';

type CreateArguments = Parameters<AssessmentAssignmentService['create']>;

type CreateResult = Awaited<ReturnType<AssessmentAssignmentService['create']>>;

type ListFormVersionsArguments = Parameters<AssessmentAssignmentService['listFormVersions']>;

type ListFormVersionsResult = Awaited<ReturnType<AssessmentAssignmentService['listFormVersions']>>;

type ListGroupsArguments = Parameters<AssessmentAssignmentService['listGroups']>;

type ListGroupsResult = Awaited<ReturnType<AssessmentAssignmentService['listGroups']>>;

interface RouteHarness {
  app: Hono<ApiEnv>;
  calls: {
    create: CreateArguments[];
    listFormVersions: ListFormVersionsArguments[];
    listGroups: ListGroupsArguments[];
  };
}

const SUCCESS_RESULT = {
  groupId: 'assignment-group-1',
  selectedParticipantCount: 2,
  candidateAssignmentCount: 2,
  createdAssignmentCount: 2,
  skippedDuplicateCount: 0,
  skippedNoRelationCount: 0,
  programId: 'program-1',
  publicFormId: 'public-form-1',
  publicFormVersionId: 'version-1',
  versionNumber: 1,
  assessmentType: 'SELF',
  name: 'Self Batch A',
  selection: {
    mode: 'BATCHES',
    batchIds: ['batch-a'],
    includeWithoutBatch: false,
  },
  groupStatus: 'ACTIVE',
  assignmentStatus: 'AVAILABLE',
  availableFrom: null,
  dueAt: null,
  createdAt: '2026-07-24T11:00:00.000Z',
} as CreateResult;

const FORM_VERSION_RESULT = {
  items: [
    {
      id: 'version-2',
      publicFormId: 'public-form-1',
      formSlug: 'form-satu',
      formTitle: 'Form Satu',
      formDescription: null,
      versionNumber: 2,
      publishedAt: '2026-07-24T10:00:00.000Z',
      sectionCount: 2,
      questionCount: 10,
    },
  ],
  total: 1,
  page: 2,
  pageSize: 10,
} as ListFormVersionsResult;

const GROUP_LIST_RESULT = {
  items: [
    {
      id: 'assignment-group-1',
      programId: 'program-1',
      publicFormId: 'public-form-1',
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
      createdAt: '2026-07-24T11:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
} as ListGroupsResult;

const READER_PRINCIPAL: AuthPrincipal = {
  id: 'admin-reader',
  userId: 'reader',
  fullName: 'Assessment Reader',
  roles: ['ADMIN'],
  permissions: ['assessment.read'],
};

const MANAGER_PRINCIPAL: AuthPrincipal = {
  id: 'admin-1',
  userId: 'admin',
  fullName: 'Administrator',
  roles: ['ADMIN'],
  permissions: ['assessment.manage'],
};

const USER_PRINCIPAL: AuthPrincipal = {
  id: 'user-1',
  userId: 'user',
  fullName: 'User Biasa',
  roles: ['USER'],
  permissions: [],
};

function createHarness(principal?: AuthPrincipal): RouteHarness {
  const calls = {
    create: [] as CreateArguments[],
    listFormVersions: [] as ListFormVersionsArguments[],
    listGroups: [] as ListGroupsArguments[],
  };

  const assessmentAssignmentService = {
    create: async (...args: CreateArguments): Promise<CreateResult> => {
      calls.create.push(args);

      return SUCCESS_RESULT;
    },

    listFormVersions: async (
      ...args: ListFormVersionsArguments
    ): Promise<ListFormVersionsResult> => {
      calls.listFormVersions.push(args);

      return FORM_VERSION_RESULT;
    },

    listGroups: async (...args: ListGroupsArguments): Promise<ListGroupsResult> => {
      calls.listGroups.push(args);

      return GROUP_LIST_RESULT;
    },
  } as unknown as AssessmentAssignmentService;

  const app = new Hono<ApiEnv>();

  app.use('*', async (context, next) => {
    context.set('requestId', 'request-assignment-route');

    if (principal) {
      context.set('auth', principal);
    }

    await next();
  });

  app.route(
    '/api',
    assessmentAssignmentRoutes({
      assessmentAssignmentService,
    }),
  );

  app.onError((error, context) => formatError(error, context));

  return {
    app,
    calls,
  };
}

function requestHeaders(): Record<string, string> {
  return {
    'user-agent': 'assignment-route-test',
    'x-forwarded-for': '203.0.113.10, 10.0.0.1',
  };
}

async function createAssignmentRequest(harness: RouteHarness, body: unknown): Promise<Response> {
  return harness.app.request('/api/admin/programs/program-1/assessment-assignments', {
    method: 'POST',
    headers: {
      ...requestHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Assessment Assignment read routes', () => {
  it('menolak daftar versi form tanpa autentikasi', async () => {
    const harness = createHarness();

    const response = await harness.app.request('/api/admin/public-form-versions', {
      headers: requestHeaders(),
    });

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      code: 'UNAUTHORIZED',
      requestId: 'request-assignment-route',
    });

    expect(harness.calls.listFormVersions).toHaveLength(0);
  });

  it('menolak principal tanpa assessment.read', async () => {
    const harness = createHarness(USER_PRINCIPAL);

    const response = await harness.app.request('/api/admin/public-form-versions', {
      headers: requestHeaders(),
    });

    expect(response.status).toBe(403);

    expect(harness.calls.listFormVersions).toHaveLength(0);
  });

  it('meneruskan query daftar versi form yang dinormalisasi', async () => {
    const harness = createHarness(READER_PRINCIPAL);

    const response = await harness.app.request(
      '/api/admin/public-form-versions?page=2&pageSize=10&search=%20%20Form%20Satu%20%20',
      {
        headers: requestHeaders(),
      },
    );

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual(FORM_VERSION_RESULT);

    expect(harness.calls.listFormVersions).toEqual([
      [
        {
          page: 2,
          pageSize: 10,
          search: 'Form Satu',
        },
      ],
    ]);
  });

  it('menolak query daftar yang tidak valid', async () => {
    const harness = createHarness(READER_PRINCIPAL);

    const response = await harness.app.request('/api/admin/public-form-versions?page=0', {
      headers: requestHeaders(),
    });

    expect(response.status).toBe(400);

    expect(harness.calls.listFormVersions).toHaveLength(0);
  });

  it('meneruskan program, query, dan AdminContext untuk daftar group', async () => {
    const harness = createHarness(READER_PRINCIPAL);

    const response = await harness.app.request(
      '/api/admin/programs/program-1/assessment-assignment-groups?search=%20SELF%20',
      {
        headers: requestHeaders(),
      },
    );

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual(GROUP_LIST_RESULT);

    expect(harness.calls.listGroups).toHaveLength(1);

    const [programId, query, context] = harness.calls.listGroups[0] ?? [];

    expect(programId).toBe('program-1');

    expect(query).toEqual({
      page: 1,
      pageSize: 20,
      search: 'SELF',
    });

    expect(context).toMatchObject({
      actor: {
        id: 'admin-reader',
        userId: 'reader',
        roles: ['ADMIN'],
        permissions: ['assessment.read'],
      },
      ip: '203.0.113.10',
      userAgent: 'assignment-route-test',
      requestId: 'request-assignment-route',
    });
  });
});

describe('Assessment Assignment create route', () => {
  it('menolak request tanpa autentikasi', async () => {
    const harness = createHarness();

    const response = await createAssignmentRequest(harness, {
      name: 'Self Assessment',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'ALL_ACTIVE',
      },
    });

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      code: 'UNAUTHORIZED',
      requestId: 'request-assignment-route',
    });

    expect(harness.calls.create).toHaveLength(0);
  });

  it('menolak principal tanpa assessment.manage', async () => {
    const harness = createHarness(USER_PRINCIPAL);

    const response = await createAssignmentRequest(harness, {
      name: 'Self Assessment',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'ALL_ACTIVE',
      },
    });

    expect(response.status).toBe(403);

    expect(await response.json()).toMatchObject({
      code: 'FORBIDDEN',
      requestId: 'request-assignment-route',
    });

    expect(harness.calls.create).toHaveLength(0);
  });

  it('menolak payload Assignment yang tidak valid', async () => {
    const harness = createHarness(MANAGER_PRINCIPAL);

    const response = await createAssignmentRequest(harness, {
      name: 'Assignment Invalid',
      publicFormVersionId: 'version-1',
      assessmentType: 'PEER',
      selection: {
        mode: 'ALL_ACTIVE',
      },
      availableFrom: '2026-07-24T10:00:00Z',
      dueAt: '2026-07-24T10:00:00Z',
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        dueAt: expect.any(Array),
      },
      requestId: 'request-assignment-route',
    });

    expect(harness.calls.create).toHaveLength(0);
  });

  it('meneruskan payload dan AdminContext ke service', async () => {
    const harness = createHarness(MANAGER_PRINCIPAL);

    const response = await createAssignmentRequest(harness, {
      name: '  Self Batch A  ',
      publicFormVersionId: ' version-1 ',
      assessmentType: 'SELF',
      selection: {
        mode: 'BATCHES',
        batchIds: [' batch-a '],
      },
      availableFrom: null,
      dueAt: null,
    });

    expect(response.status).toBe(201);

    expect(await response.json()).toEqual(SUCCESS_RESULT);

    expect(harness.calls.create).toHaveLength(1);

    const [programId, input, context] = harness.calls.create[0] ?? [];

    expect(programId).toBe('program-1');

    expect(input).toEqual({
      name: 'Self Batch A',
      publicFormVersionId: 'version-1',
      assessmentType: 'SELF',
      selection: {
        mode: 'BATCHES',
        batchIds: ['batch-a'],
        includeWithoutBatch: false,
      },
      availableFrom: null,
      dueAt: null,
    });

    expect(context).toMatchObject({
      actor: {
        id: 'admin-1',
        userId: 'admin',
        roles: ['ADMIN'],
        permissions: ['assessment.manage'],
      },
      ip: '203.0.113.10',
      userAgent: 'assignment-route-test',
      requestId: 'request-assignment-route',
    });
  });
});
