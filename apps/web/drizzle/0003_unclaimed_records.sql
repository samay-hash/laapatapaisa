CREATE TYPE "public"."record_kind" AS ENUM('unclaimed_dividend', 'shares_transferred_to_iepf', 'other');--> statement-breakpoint
CREATE TYPE "public"."search_kind" AS ENUM('summary', 'suggest', 'match', 'confirm');--> statement-breakpoint
CREATE TABLE "search_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "search_kind" NOT NULL,
	"user_id" text,
	"ip_hash" text NOT NULL,
	"pin_code" char(6),
	"query" text,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unclaimed_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"investor_name" text NOT NULL,
	"father_name" text,
	"address" text,
	"district" text,
	"state" text,
	"pin_code" char(6) NOT NULL,
	"folio" text,
	"amount_paise" bigint,
	"shares" integer,
	"investment_type" text,
	"transfer_date" date,
	"first_key" text NOT NULL,
	"last_key" text NOT NULL,
	"initials" text NOT NULL,
	"name_keys" text[] NOT NULL,
	"father_keys" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unclaimed_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unclaimed_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"url" text NOT NULL,
	"kind" "record_kind" NOT NULL,
	"financial_year" text,
	"file_hash" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unclaimed_source_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
ALTER TABLE "unclaimed_source" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "search_event" ADD CONSTRAINT "search_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unclaimed_record" ADD CONSTRAINT "unclaimed_record_source_id_unclaimed_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."unclaimed_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_event_ip_time_idx" ON "search_event" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "search_event_user_time_idx" ON "search_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "unclaimed_record_pin_first_idx" ON "unclaimed_record" USING btree ("pin_code","first_key");--> statement-breakpoint
CREATE INDEX "unclaimed_record_pin_last_idx" ON "unclaimed_record" USING btree ("pin_code","last_key");--> statement-breakpoint
CREATE INDEX "unclaimed_record_source_idx" ON "unclaimed_record" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "unclaimed_source_company_idx" ON "unclaimed_source" USING btree ("company");