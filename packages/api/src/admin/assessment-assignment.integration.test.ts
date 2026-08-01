import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AssessmentAssignmentService, AuthPrincipal } from '@sarel/core';

import { formatError } from '../errors';
import type { ApiEnv } from '../middleware/types';
import { assessmentAssignmentRoutes } from '../routes/admin/assessment-assignments';

type CreateArguments = Parameters<AssessmentAssignmentService['create']>;

type CreateResult = Awaited<ReturnType<AssessmentAssignmentService['create']>>;

interface RouteHarness {
  app: Hono<ApiEnv>;
  calls: CreateArguments[];
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

const ADMIN_PRINCIPAL: AuthPrincipal = {
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
  const calls: CreateArguments[] = [];

  const assessmentAssignmentService = {
    create: async (...args: CreateArguments): Promise<CreateResult> => {
      calls.push(args);

      return SUCCESS_RESULT;
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

async function createAssignmentRequest(harness: RouteHarness, body: unknown): Promise<Response> {
  return harness.app.request('/api/admin/programs/program-1/assessment-assignments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'assignment-route-test',
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('Assessment Assignment route', () => {
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

    expect(harness.calls).toHaveLength(0);
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

    expect(harness.calls).toHaveLength(0);
  });

  it('menolak payload Assignment yang tidak valid', async () => {
    const harness = createHarness(ADMIN_PRINCIPAL);

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

    expect(harness.calls).toHaveLength(0);
  });

  it('meneruskan payload yang dinormalisasi dan AdminContext ke service', async () => {
    const harness = createHarness(ADMIN_PRINCIPAL);

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

    expect(harness.calls).toHaveLength(1);

    const [programId, input, context] = harness.calls[0] ?? [];

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
