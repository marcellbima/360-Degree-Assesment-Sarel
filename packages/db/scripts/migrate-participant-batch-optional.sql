BEGIN;

ALTER TABLE program_participants
  ALTER COLUMN batch_id DROP NOT NULL;

COMMIT;
