import { describe, expect, it } from 'vitest';

import { assessmentAssignmentListQuerySchema } from './assessment-assignment';

describe('assessmentAssignmentListQuerySchema', () => {
  it('memberikan pagination default', () => {
    expect(assessmentAssignmentListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('melakukan coercion dan trim search', () => {
    expect(
      assessmentAssignmentListQuerySchema.parse({
        page: '2',
        pageSize: '10',
        search: '  Form Satu  ',
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      search: 'Form Satu',
    });
  });

  it('menolak nomor halaman yang tidak valid', () => {
    expect(
      assessmentAssignmentListQuerySchema.safeParse({
        page: 0,
      }).success,
    ).toBe(false);
  });
});
