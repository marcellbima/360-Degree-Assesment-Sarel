CREATE TABLE IF NOT EXISTS "public_form_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"respondent_name" text,
	"respondent_email" text,
	"answers" jsonb NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"draft_definition" jsonb NOT NULL,
	"published_definition" jsonb,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_form_submissions" ADD CONSTRAINT "public_form_submissions_form_id_public_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."public_forms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_forms" ADD CONSTRAINT "public_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_form_submissions_form" ON "public_form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_form_submissions_submitted_at" ON "public_form_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_public_forms_slug" ON "public_forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_forms_status" ON "public_forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_forms_schedule" ON "public_forms" USING btree ("opens_at","closes_at");