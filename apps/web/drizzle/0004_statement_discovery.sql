CREATE TYPE "public"."statement_status" AS ENUM('pending', 'imported', 'unchanged', 'no_records', 'unsupported', 'failed');--> statement-breakpoint
CREATE TABLE "company_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"last_error" text,
	"links_found" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_page_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "company_page" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "statement_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"url" text NOT NULL,
	"kind" "record_kind" NOT NULL,
	"financial_year" text,
	"found_on" text,
	"status" "statement_status" DEFAULT 'pending' NOT NULL,
	"last_hash" text,
	"last_checked_at" timestamp with time zone,
	"last_error" text,
	"records" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_file_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "statement_file" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "statement_file_status_idx" ON "statement_file" USING btree ("status","last_checked_at");