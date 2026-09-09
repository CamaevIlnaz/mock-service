-- CreateTable
CREATE TABLE "stands" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "base_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "stand_code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connection_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stands_code_key" ON "stands"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mock_servers_connection_token_key" ON "mock_servers"("connection_token");

-- CreateIndex
CREATE INDEX "mock_servers_user_id_idx" ON "mock_servers"("user_id");

-- CreateIndex
CREATE INDEX "mock_servers_user_id_sort_order_idx" ON "mock_servers"("user_id", "sort_order");

-- AddForeignKey
ALTER TABLE "mock_servers" ADD CONSTRAINT "mock_servers_stand_code_fkey" FOREIGN KEY ("stand_code") REFERENCES "stands"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_servers" ADD CONSTRAINT "mock_servers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
