-- Run once on PostgreSQL production DB after deploying TSA security audit fields.
ALTER TABLE "TodaysFlights" ADD COLUMN IF NOT EXISTS "crewId" VARCHAR(255);
ALTER TABLE "TodaysFlights" ADD COLUMN IF NOT EXISTS "cockpitInspection" VARCHAR(255);
ALTER TABLE "TodaysFlights" ADD COLUMN IF NOT EXISTS "cabinInspection" VARCHAR(255);
ALTER TABLE "TodaysFlights" ADD COLUMN IF NOT EXISTS "cargoInspection" VARCHAR(255);
ALTER TABLE "TodaysFlights" ADD COLUMN IF NOT EXISTS "wheelWellInspection" VARCHAR(255);
