-- AlterTable
ALTER TABLE "mock_response_files" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "mock_response_files" SET "updated_at" = "created_at";
ALTER TABLE "mock_response_files" ALTER COLUMN "updated_at" DROP DEFAULT;
