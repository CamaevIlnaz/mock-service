/*
  Warnings:

  - You are about to drop the `schema_bootstrap` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "schema_bootstrap";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");
