-- Convert entity IDs from TEXT (cuid) to INTEGER (autoincrement)

-- Drop FKs
ALTER TABLE "mock_servers" DROP CONSTRAINT "mock_servers_user_id_fkey";
ALTER TABLE "mock_servers" DROP CONSTRAINT "mock_servers_stand_code_fkey";
ALTER TABLE "mock_rules" DROP CONSTRAINT "mock_rules_mock_server_id_fkey";
ALTER TABLE "mock_rules" DROP CONSTRAINT "mock_rules_response_file_id_fkey";
ALTER TABLE "mock_response_files" DROP CONSTRAINT "mock_response_files_mock_server_id_fkey";

-- users: TEXT id -> SERIAL
ALTER TABLE "users" ADD COLUMN "id_new" SERIAL;
CREATE TABLE "_user_id_map" AS SELECT "id" AS "old_id", "id_new" AS "new_id" FROM "users";
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "users_id_new_seq" RENAME TO "users_id_seq";
ALTER SEQUENCE "users_id_seq" OWNED BY "users"."id";

-- stands: TEXT id -> SERIAL
ALTER TABLE "stands" ADD COLUMN "id_new" SERIAL;
ALTER TABLE "stands" DROP CONSTRAINT "stands_pkey";
ALTER TABLE "stands" DROP COLUMN "id";
ALTER TABLE "stands" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "stands" ADD CONSTRAINT "stands_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "stands_id_new_seq" RENAME TO "stands_id_seq";
ALTER SEQUENCE "stands_id_seq" OWNED BY "stands"."id";

-- mock_servers: TEXT id/user_id -> INTEGER
ALTER TABLE "mock_servers" ADD COLUMN "id_new" SERIAL;
ALTER TABLE "mock_servers" ADD COLUMN "user_id_new" INTEGER;
UPDATE "mock_servers" ms
SET "user_id_new" = m."new_id"
FROM "_user_id_map" m
WHERE ms."user_id" = m."old_id";
CREATE TABLE "_mock_server_id_map" AS
SELECT "id" AS "old_id", "id_new" AS "new_id" FROM "mock_servers";
ALTER TABLE "mock_servers" DROP CONSTRAINT "mock_servers_pkey";
ALTER TABLE "mock_servers" DROP COLUMN "id";
ALTER TABLE "mock_servers" DROP COLUMN "user_id";
ALTER TABLE "mock_servers" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "mock_servers" RENAME COLUMN "user_id_new" TO "user_id";
ALTER TABLE "mock_servers" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "mock_servers" ADD CONSTRAINT "mock_servers_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "mock_servers_id_new_seq" RENAME TO "mock_servers_id_seq";
ALTER SEQUENCE "mock_servers_id_seq" OWNED BY "mock_servers"."id";
DROP INDEX IF EXISTS "mock_servers_user_id_idx";
DROP INDEX IF EXISTS "mock_servers_user_id_sort_order_idx";
CREATE INDEX "mock_servers_user_id_idx" ON "mock_servers"("user_id");
CREATE INDEX "mock_servers_user_id_sort_order_idx" ON "mock_servers"("user_id", "sort_order");

-- mock_response_files: TEXT id/mock_server_id -> INTEGER
ALTER TABLE "mock_response_files" ADD COLUMN "id_new" SERIAL;
ALTER TABLE "mock_response_files" ADD COLUMN "mock_server_id_new" INTEGER;
UPDATE "mock_response_files" f
SET "mock_server_id_new" = m."new_id"
FROM "_mock_server_id_map" m
WHERE f."mock_server_id" = m."old_id";
CREATE TABLE "_mock_response_file_id_map" AS
SELECT "id" AS "old_id", "id_new" AS "new_id" FROM "mock_response_files";
ALTER TABLE "mock_response_files" DROP CONSTRAINT "mock_response_files_pkey";
ALTER TABLE "mock_response_files" DROP COLUMN "id";
ALTER TABLE "mock_response_files" DROP COLUMN "mock_server_id";
ALTER TABLE "mock_response_files" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "mock_response_files" RENAME COLUMN "mock_server_id_new" TO "mock_server_id";
ALTER TABLE "mock_response_files" ALTER COLUMN "mock_server_id" SET NOT NULL;
ALTER TABLE "mock_response_files" ADD CONSTRAINT "mock_response_files_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "mock_response_files_id_new_seq" RENAME TO "mock_response_files_id_seq";
ALTER SEQUENCE "mock_response_files_id_seq" OWNED BY "mock_response_files"."id";
DROP INDEX IF EXISTS "mock_response_files_mock_server_id_idx";
CREATE INDEX "mock_response_files_mock_server_id_idx" ON "mock_response_files"("mock_server_id");

-- mock_rules: TEXT id/FKs -> INTEGER
ALTER TABLE "mock_rules" ADD COLUMN "id_new" SERIAL;
ALTER TABLE "mock_rules" ADD COLUMN "mock_server_id_new" INTEGER;
ALTER TABLE "mock_rules" ADD COLUMN "response_file_id_new" INTEGER;
UPDATE "mock_rules" r
SET "mock_server_id_new" = m."new_id"
FROM "_mock_server_id_map" m
WHERE r."mock_server_id" = m."old_id";
UPDATE "mock_rules" r
SET "response_file_id_new" = m."new_id"
FROM "_mock_response_file_id_map" m
WHERE r."response_file_id" = m."old_id";
ALTER TABLE "mock_rules" DROP CONSTRAINT "mock_rules_pkey";
ALTER TABLE "mock_rules" DROP COLUMN "id";
ALTER TABLE "mock_rules" DROP COLUMN "mock_server_id";
ALTER TABLE "mock_rules" DROP COLUMN "response_file_id";
ALTER TABLE "mock_rules" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "mock_rules" RENAME COLUMN "mock_server_id_new" TO "mock_server_id";
ALTER TABLE "mock_rules" RENAME COLUMN "response_file_id_new" TO "response_file_id";
ALTER TABLE "mock_rules" ALTER COLUMN "mock_server_id" SET NOT NULL;
ALTER TABLE "mock_rules" ADD CONSTRAINT "mock_rules_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "mock_rules_id_new_seq" RENAME TO "mock_rules_id_seq";
ALTER SEQUENCE "mock_rules_id_seq" OWNED BY "mock_rules"."id";
DROP INDEX IF EXISTS "mock_rules_mock_server_id_priority_idx";
DROP INDEX IF EXISTS "mock_rules_response_file_id_idx";
CREATE INDEX "mock_rules_mock_server_id_priority_idx" ON "mock_rules"("mock_server_id", "priority");
CREATE INDEX "mock_rules_response_file_id_idx" ON "mock_rules"("response_file_id");

-- Recreate FKs
ALTER TABLE "mock_servers"
  ADD CONSTRAINT "mock_servers_stand_code_fkey"
  FOREIGN KEY ("stand_code") REFERENCES "stands"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mock_servers"
  ADD CONSTRAINT "mock_servers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_response_files"
  ADD CONSTRAINT "mock_response_files_mock_server_id_fkey"
  FOREIGN KEY ("mock_server_id") REFERENCES "mock_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_rules"
  ADD CONSTRAINT "mock_rules_mock_server_id_fkey"
  FOREIGN KEY ("mock_server_id") REFERENCES "mock_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_rules"
  ADD CONSTRAINT "mock_rules_response_file_id_fkey"
  FOREIGN KEY ("response_file_id") REFERENCES "mock_response_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cleanup maps
DROP TABLE "_user_id_map";
DROP TABLE "_mock_server_id_map";
DROP TABLE "_mock_response_file_id_map";
