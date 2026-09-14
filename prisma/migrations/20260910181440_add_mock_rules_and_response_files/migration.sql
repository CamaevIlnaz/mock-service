-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "MockResponseType" AS ENUM ('INLINE_JSON', 'FILE');

-- CreateTable
CREATE TABLE "mock_rules" (
    "id" TEXT NOT NULL,
    "mock_server_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "url_mask" VARCHAR(1000) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status_code" INTEGER NOT NULL DEFAULT 200,
    "delay_ms" INTEGER NOT NULL DEFAULT 0,
    "response_type" "MockResponseType" NOT NULL DEFAULT 'INLINE_JSON',
    "response_body" JSONB,
    "response_file_id" TEXT,
    "response_headers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_response_files" (
    "id" TEXT NOT NULL,
    "mock_server_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_response_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_rules_mock_server_id_priority_idx" ON "mock_rules"("mock_server_id", "priority");

-- CreateIndex
CREATE INDEX "mock_rules_response_file_id_idx" ON "mock_rules"("response_file_id");

-- CreateIndex
CREATE INDEX "mock_response_files_mock_server_id_idx" ON "mock_response_files"("mock_server_id");

-- AddForeignKey
ALTER TABLE "mock_rules" ADD CONSTRAINT "mock_rules_mock_server_id_fkey" FOREIGN KEY ("mock_server_id") REFERENCES "mock_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_rules" ADD CONSTRAINT "mock_rules_response_file_id_fkey" FOREIGN KEY ("response_file_id") REFERENCES "mock_response_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_response_files" ADD CONSTRAINT "mock_response_files_mock_server_id_fkey" FOREIGN KEY ("mock_server_id") REFERENCES "mock_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
