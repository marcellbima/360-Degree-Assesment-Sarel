PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

ALTER TABLE program_participants
  RENAME TO program_participants_old;

CREATE TABLE program_participants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL
    REFERENCES users(id),
  program_id TEXT NOT NULL
    REFERENCES programs(id),
  batch_id TEXT
    REFERENCES batches(id),
  organization_id TEXT
    REFERENCES organizations(id),
  employee_id TEXT,
  position TEXT,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO program_participants (
  id,
  user_id,
  program_id,
  batch_id,
  organization_id,
  employee_id,
  position,
  unit,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  program_id,
  batch_id,
  organization_id,
  employee_id,
  position,
  unit,
  status,
  created_at,
  updated_at
FROM program_participants_old;

DROP TABLE program_participants_old;

CREATE UNIQUE INDEX ux_program_participants_enrollment
  ON program_participants (
    program_id,
    batch_id,
    user_id
  );

CREATE INDEX ix_program_participants_user
  ON program_participants (user_id);

CREATE INDEX ix_program_participants_program
  ON program_participants (program_id);

CREATE INDEX ix_program_participants_batch
  ON program_participants (batch_id);

CREATE INDEX ix_program_participants_status
  ON program_participants (status);

CREATE UNIQUE INDEX ux_program_participants_active_user
  ON program_participants (
    program_id,
    user_id
  )
  WHERE status = 'ACTIVE';

COMMIT;

PRAGMA foreign_keys = ON;
