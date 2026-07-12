import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  canManageRole,
  changedRoles,
  isAccessReduced,
  normalizeRoles,
} from './role-assignment';

describe('role-assignment policy', () => {
  it(
    'hanya SUPERADMIN dapat mengelola role SUPERADMIN dan ADMIN',
    () => {
      expect(
        canManageRole(
          ['SUPERADMIN'],
          'SUPERADMIN',
        ),
      ).toBe(true);

      expect(
        canManageRole(
          ['SUPERADMIN'],
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        canManageRole(
          ['ADMIN'],
          'SUPERADMIN',
        ),
      ).toBe(false);

      expect(
        canManageRole(
          ['ADMIN'],
          'ADMIN',
        ),
      ).toBe(false);
    },
  );

  it(
    'EVALUATOR dan USER dapat dikelola oleh ADMIN atau SUPERADMIN',
    () => {
      for (
        const targetRole of [
          'EVALUATOR',
          'USER',
        ]
      ) {
        expect(
          canManageRole(
            ['ADMIN'],
            targetRole,
          ),
        ).toBe(true);

        expect(
          canManageRole(
            ['SUPERADMIN'],
            targetRole,
          ),
        ).toBe(true);

        expect(
          canManageRole(
            ['USER'],
            targetRole,
          ),
        ).toBe(false);

        expect(
          canManageRole(
            ['EVALUATOR'],
            targetRole,
          ),
        ).toBe(false);
      }
    },
  );

  it(
    'menolak role yang tidak dikenal',
    () => {
      expect(
        canManageRole(
          ['SUPERADMIN'],
          'UNKNOWN',
        ),
      ).toBe(false);
    },
  );

  it(
    'changedRoles menemukan penambahan dan pencabutan',
    () => {
      expect(
        changedRoles(
          ['USER'],
          ['USER', 'EVALUATOR'],
        ).sort(),
      ).toEqual(['EVALUATOR']);

      expect(
        changedRoles(
          ['ADMIN', 'USER'],
          ['USER'],
        ).sort(),
      ).toEqual(['ADMIN']);

      expect(
        changedRoles(
          ['USER'],
          ['USER'],
        ),
      ).toEqual([]);
    },
  );

  it(
    'isAccessReduced true bila role lama hilang',
    () => {
      expect(
        isAccessReduced(
          ['EVALUATOR', 'USER'],
          ['USER'],
        ),
      ).toBe(true);

      expect(
        isAccessReduced(
          ['USER'],
          ['USER', 'EVALUATOR'],
        ),
      ).toBe(false);
    },
  );

  it(
    'normalizeRoles menghapus duplikat',
    () => {
      expect(
        normalizeRoles([
          'USER',
          'EVALUATOR',
          'USER',
          'ADMIN',
        ]),
      ).toEqual([
        'ADMIN',
        'EVALUATOR',
        'USER',
      ]);
    },
  );
});
