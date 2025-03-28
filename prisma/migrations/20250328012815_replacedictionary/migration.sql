-- CreateTable
CREATE TABLE "ReplaceDictionary" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownedById" TEXT NOT NULL,

    CONSTRAINT "ReplaceDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReplaceDictionary_ownedById_key" ON "ReplaceDictionary"("ownedById");

-- CreateIndex
CREATE INDEX "ReplaceDictionary_ownedById_idx" ON "ReplaceDictionary"("ownedById");

-- CreateIndex
CREATE INDEX "ReplaceDictionary_from_idx" ON "ReplaceDictionary"("from");

-- CreateIndex
CREATE INDEX "ReplaceDictionary_to_idx" ON "ReplaceDictionary"("to");

-- AddForeignKey
ALTER TABLE "ReplaceDictionary" ADD CONSTRAINT "ReplaceDictionary_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
