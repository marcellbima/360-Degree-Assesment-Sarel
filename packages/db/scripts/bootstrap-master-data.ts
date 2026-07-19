import process from 'node:process';
import { Client } from 'pg';

interface AssessmentTypeSeed {
  stableId: string;
  code: string;
  name: string;
  description: string;
  orderIndex: number;
  isSelf: boolean;
  requiresEvaluatorRelation: boolean;
  defaultTarget: number;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} wajib diisi.`);
  }

  return value;
}

const assessmentTypes: AssessmentTypeSeed[] = [
  {
    stableId: 'ast_self',
    code: 'SELF',
    name: 'Penilaian Diri',
    description:
      'Penilaian yang dilakukan peserta terhadap dirinya sendiri.',
    orderIndex: 1,
    isSelf: true,
    requiresEvaluatorRelation: false,
    defaultTarget: 1,
  },
  {
    stableId: 'ast_superior',
    code: 'SUPERIOR',
    name: 'Atasan',
    description:
      'Penilaian yang dilakukan oleh atasan terhadap peserta.',
    orderIndex: 2,
    isSelf: false,
    requiresEvaluatorRelation: true,
    defaultTarget: 0,
  },
  {
    stableId: 'ast_peer',
    code: 'PEER',
    name: 'Rekan Kerja',
    description:
      'Penilaian yang dilakukan oleh rekan kerja terhadap peserta.',
    orderIndex: 3,
    isSelf: false,
    requiresEvaluatorRelation: true,
    defaultTarget: 0,
  },
  {
    stableId: 'ast_subordinate',
    code: 'SUBORDINATE',
    name: 'Bawahan',
    description:
      'Penilaian yang dilakukan oleh bawahan terhadap peserta.',
    orderIndex: 4,
    isSelf: false,
    requiresEvaluatorRelation: true,
    defaultTarget: 0,
  },
];

async function main(): Promise<void> {
  const databaseUrl =
    requiredEnv('DATABASE_URL');

  const client =
    new Client({
      connectionString:
        databaseUrl,
    });

  await client.connect();

  try {
    await client.query('BEGIN');

    for (
      const assessmentType
      of assessmentTypes
    ) {
      const result =
        await client.query<{
          id: string;
          code: string;
        }>(
          `
            INSERT INTO assessment_types (
              id,
              code,
              name,
              description,
              order_index,
              is_self,
              requires_evaluator_relation,
              default_target,
              status,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              'ACTIVE',
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (code)
            DO UPDATE SET
              name =
                EXCLUDED.name,
              description =
                EXCLUDED.description,
              order_index =
                EXCLUDED.order_index,
              is_self =
                EXCLUDED.is_self,
              requires_evaluator_relation =
                EXCLUDED.requires_evaluator_relation,
              default_target =
                EXCLUDED.default_target,
              status =
                'ACTIVE',
              updated_at =
                CURRENT_TIMESTAMP
            RETURNING
              id,
              code
          `,
          [
            assessmentType.stableId,
            assessmentType.code,
            assessmentType.name,
            assessmentType.description,
            assessmentType.orderIndex,
            assessmentType.isSelf,
            assessmentType
              .requiresEvaluatorRelation,
            assessmentType.defaultTarget,
          ],
        );

      console.log(
        `[bootstrap] Assessment type ${
          result.rows[0]?.code ??
          assessmentType.code
        } siap.`,
      );
    }

    await client.query('COMMIT');

    console.log(
      '[bootstrap] Master Assessment Type berhasil disiapkan.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Bootstrap master data gagal.',
  );

  process.exitCode = 1;
});
