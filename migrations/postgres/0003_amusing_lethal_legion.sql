ALTER TABLE "public_forms" ADD COLUMN "google_sheet_id" text;--> statement-breakpoint
ALTER TABLE "public_forms" ADD COLUMN "google_sheet_url" text;--> statement-breakpoint
ALTER TABLE "public_forms" ADD COLUMN "google_sheet_status" text DEFAULT 'NOT_CONNECTED' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_forms" ADD COLUMN "google_sheet_connected_at" timestamp with time zone;