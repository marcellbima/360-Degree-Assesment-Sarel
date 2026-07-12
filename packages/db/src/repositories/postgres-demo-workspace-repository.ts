import {
  count,
  eq,
  inArray,
} from 'drizzle-orm';
import type {
  DemoWorkspaceRepositoryPort,
  DemoWorkspaceStatus,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  batches,
  organizations,
  programs,
} from '../schema/postgres-schema';

export const DEMO_WORKSPACE_IDS = {
  organization:
    'demo_org_ahm',
  program:
    'demo_program_qtc_2026',
  batches: [
    'demo_batch_qtc_a',
    'demo_batch_qtc_b',
    'demo_batch_qtc_c',
  ],
} as const;

export const DEMO_WORKSPACE_CODES = {
  organization:
    'DEMO_AHM',
  program:
    'DEMO_QTC_2026',
} as const;

export class PostgresDemoWorkspaceRepository
  implements DemoWorkspaceRepositoryPort
{
  constructor(
    private readonly db:
      PostgresDatabase,
  ) {}

  async status():
    Promise<DemoWorkspaceStatus> {
    const [
      organizationResult,
      programResult,
      batchResult,
    ] = await Promise.all([
      this.db
        .select({
          value: count(),
        })
        .from(organizations)
        .where(
          eq(
            organizations.id,
            DEMO_WORKSPACE_IDS
              .organization,
          ),
        ),

      this.db
        .select({
          value: count(),
        })
        .from(programs)
        .where(
          eq(
            programs.id,
            DEMO_WORKSPACE_IDS
              .program,
          ),
        ),

      this.db
        .select({
          value: count(),
        })
        .from(batches)
        .where(
          inArray(
            batches.id,
            [
              ...DEMO_WORKSPACE_IDS
                .batches,
            ],
          ),
        ),
    ]);

    const organizationCount =
      organizationResult[0]
        ?.value ?? 0;

    const programCount =
      programResult[0]
        ?.value ?? 0;

    const batchCount =
      batchResult[0]
        ?.value ?? 0;

    return {
      loaded:
        organizationCount === 1 &&
        programCount === 1 &&
        batchCount === 3,
      organizationCount,
      programCount,
      batchCount,
    };
  }

  async load(
    actorId: string,
    now: string,
  ): Promise<DemoWorkspaceStatus> {
    await this.db.transaction(
      async (tx) => {
        await tx
          .insert(organizations)
          .values({
            id:
              DEMO_WORKSPACE_IDS
                .organization,
            code:
              DEMO_WORKSPACE_CODES
                .organization,
            name:
              '[CONTOH] Astra Honda Motor',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target:
              organizations.id,
            set: {
              code:
                DEMO_WORKSPACE_CODES
                  .organization,
              name:
                '[CONTOH] Astra Honda Motor',
              status: 'ACTIVE',
              updatedAt: now,
            },
          });

        await tx
          .insert(programs)
          .values({
            id:
              DEMO_WORKSPACE_IDS
                .program,
            code:
              DEMO_WORKSPACE_CODES
                .program,
            name:
              '[CONTOH] Qualified Trainer Clustering 2026',
            description:
              'Program contoh assessment Qualified Trainer Clustering Astra Honda Motor.',
            year: 2026,
            startDate:
              '2026-04-20',
            endDate:
              '2026-06-30',
            organizationId:
              DEMO_WORKSPACE_IDS
                .organization,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
            createdBy: actorId,
          })
          .onConflictDoUpdate({
            target: programs.id,
            set: {
              code:
                DEMO_WORKSPACE_CODES
                  .program,
              name:
                '[CONTOH] Qualified Trainer Clustering 2026',
              description:
                'Program contoh assessment Qualified Trainer Clustering Astra Honda Motor.',
              year: 2026,
              startDate:
                '2026-04-20',
              endDate:
                '2026-06-30',
              organizationId:
                DEMO_WORKSPACE_IDS
                  .organization,
              status: 'ACTIVE',
              updatedAt: now,
            },
          });

        const demoBatches = [
          {
            id:
              DEMO_WORKSPACE_IDS
                .batches[0],
            code: 'A',
            name:
              '[CONTOH] Batch A',
            description:
              'Batch contoh kelompok A.',
            orderIndex: 1,
            startDate:
              '2026-04-20',
            endDate:
              '2026-05-15',
          },
          {
            id:
              DEMO_WORKSPACE_IDS
                .batches[1],
            code: 'B',
            name:
              '[CONTOH] Batch B',
            description:
              'Batch contoh kelompok B.',
            orderIndex: 2,
            startDate:
              '2026-05-01',
            endDate:
              '2026-05-31',
          },
          {
            id:
              DEMO_WORKSPACE_IDS
                .batches[2],
            code: 'C',
            name:
              '[CONTOH] Batch C',
            description:
              'Batch contoh kelompok C.',
            orderIndex: 3,
            startDate:
              '2026-06-01',
            endDate:
              '2026-06-30',
          },
        ];

        for (
          const demoBatch
          of demoBatches
        ) {
          await tx
            .insert(batches)
            .values({
              ...demoBatch,
              programId:
                DEMO_WORKSPACE_IDS
                  .program,
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now,
              createdBy: actorId,
            })
            .onConflictDoUpdate({
              target: batches.id,
              set: {
                programId:
                  DEMO_WORKSPACE_IDS
                    .program,
                code:
                  demoBatch.code,
                name:
                  demoBatch.name,
                description:
                  demoBatch.description,
                orderIndex:
                  demoBatch.orderIndex,
                startDate:
                  demoBatch.startDate,
                endDate:
                  demoBatch.endDate,
                status: 'ACTIVE',
                updatedAt: now,
              },
            });
        }
      },
    );

    return this.status();
  }

  async clear():
    Promise<DemoWorkspaceStatus> {
    await this.db.transaction(
      async (tx) => {
        await tx
          .delete(batches)
          .where(
            inArray(
              batches.id,
              [
                ...DEMO_WORKSPACE_IDS
                  .batches,
              ],
            ),
          );

        await tx
          .delete(programs)
          .where(
            eq(
              programs.id,
              DEMO_WORKSPACE_IDS
                .program,
            ),
          );

        await tx
          .delete(organizations)
          .where(
            eq(
              organizations.id,
              DEMO_WORKSPACE_IDS
                .organization,
            ),
          );
      },
    );

    return this.status();
  }
}
