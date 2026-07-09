ALTER TABLE "public_form_submissions" ADD COLUMN "sheet_sync_status" text DEFAULT 'NOT_CONFIGURED' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_form_submissions" ADD COLUMN "sheet_sync_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "public_form_submissions" ADD COLUMN "sheet_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "public_form_submissions" ADD COLUMN "sheet_sync_error" text;--> statement-breakpoint
ALTER TABLE "public_forms" ADD COLUMN "google_sheets_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "public_forms" ADD COLUMN "google_sheets_webhook_url" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_public_form_submissions_sheet_sync_status" ON "public_form_submissions" USING btree ("sheet_sync_status");