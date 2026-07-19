CREATE TABLE IF NOT EXISTS "assessment_assignment_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"public_form_version_id" text NOT NULL,
	"assessment_type_id" text NOT NULL,
	"name" text NOT NULL,
	"selection_mode" text NOT NULL,
	"selection_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"available_from" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_assignment_groups_schedule" CHECK ("assessment_assignment_groups"."due_at" IS NULL OR "assessment_assignment_groups"."available_from" IS NULL OR "assessment_assignment_groups"."due_at" > "assessment_assignment_groups"."available_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_form_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"public_form_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "ux_users_user_id";--> statement-breakpoint
ALTER TABLE "assessment_assignments" ALTER COLUMN "evaluator_relation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ALTER COLUMN "questionnaire_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "program_participants" ALTER COLUMN "batch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "assignment_group_id" text;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "program_participant_id" text;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "evaluator_user_id" text;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "assessment_type_id" text;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "public_form_version_id" text;--> statement-breakpoint
ALTER TABLE "assessment_assignments" ADD COLUMN "created_by" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignment_groups" ADD CONSTRAINT "assessment_assignment_groups_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignment_groups" ADD CONSTRAINT "assessment_assignment_groups_public_form_version_id_public_form_versions_id_fk" FOREIGN KEY ("public_form_version_id") REFERENCES "public"."public_form_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignment_groups" ADD CONSTRAINT "assessment_assignment_groups_assessment_type_id_assessment_types_id_fk" FOREIGN KEY ("assessment_type_id") REFERENCES "public"."assessment_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignment_groups" ADD CONSTRAINT "assessment_assignment_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_form_versions" ADD CONSTRAINT "public_form_versions_public_form_id_public_forms_id_fk" FOREIGN KEY ("public_form_id") REFERENCES "public"."public_forms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_form_versions" ADD CONSTRAINT "public_form_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignment_groups_program" ON "assessment_assignment_groups" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignment_groups_form_version" ON "assessment_assignment_groups" USING btree ("public_form_version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignment_groups_assessment_type" ON "assessment_assignment_groups" USING btree ("assessment_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignment_groups_status" ON "assessment_assignment_groups" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_public_form_versions_form_version" ON "public_form_versions" USING btree ("public_form_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_form_versions_form" ON "public_form_versions" USING btree ("public_form_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_form_versions_published_at" ON "public_form_versions" USING btree ("published_at");--> statement-breakpoint
INSERT INTO "public_form_versions" (
  "id",
  "public_form_id",
  "version_number",
  "definition",
  "published_at",
  "created_by",
  "created_at"
)
SELECT
  'pfv_migrated_' ||
    substr(
      md5(pf."id"),
      1,
      24
    ),
  pf."id",
  1,
  pf."published_definition",
  COALESCE(
    pf."published_at",
    pf."updated_at",
    pf."created_at",
    CURRENT_TIMESTAMP
  ),
  pf."created_by",
  COALESCE(
    pf."published_at",
    pf."updated_at",
    pf."created_at",
    CURRENT_TIMESTAMP
  )
FROM "public_forms" pf
WHERE
  pf."published_definition" IS NOT NULL
ON CONFLICT (
  "public_form_id",
  "version_number"
)
DO NOTHING;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assignment_group_id_assessment_assignment_groups_id_fk" FOREIGN KEY ("assignment_group_id") REFERENCES "public"."assessment_assignment_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_program_participant_id_program_participants_id_fk" FOREIGN KEY ("program_participant_id") REFERENCES "public"."program_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_evaluator_user_id_users_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assessment_type_id_assessment_types_id_fk" FOREIGN KEY ("assessment_type_id") REFERENCES "public"."assessment_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_public_form_version_id_public_form_versions_id_fk" FOREIGN KEY ("public_form_version_id") REFERENCES "public"."public_form_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignments_group" ON "assessment_assignments" USING btree ("assignment_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignments_participant" ON "assessment_assignments" USING btree ("program_participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignments_evaluator" ON "assessment_assignments" USING btree ("evaluator_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignments_assessment_type" ON "assessment_assignments" USING btree ("assessment_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_assignments_form_version" ON "assessment_assignments" USING btree ("public_form_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_active_assignment_v2" ON "assessment_assignments" USING btree ("program_participant_id","evaluator_user_id","assessment_type_id","public_form_version_id") WHERE "assessment_assignments"."status" IN ('ASSIGNED', 'AVAILABLE', 'IN_PROGRESS') AND "assessment_assignments"."program_participant_id" IS NOT NULL AND "assessment_assignments"."evaluator_user_id" IS NOT NULL AND "assessment_assignments"."assessment_type_id" IS NOT NULL AND "assessment_assignments"."public_form_version_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_users_user_id" ON "users" USING btree (lower("user_id"));