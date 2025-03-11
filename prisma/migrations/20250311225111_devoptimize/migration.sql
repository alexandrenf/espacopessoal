/*
  Warnings:

  - The primary key for the `UserThings` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserThings" DROP CONSTRAINT "UserThings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserThings_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UserThings_id_seq";

-- CreateIndex
CREATE INDEX "User_id_idx" ON "User"("id");

-- CreateIndex
CREATE INDEX "UserThings_ownedById_idx" ON "UserThings"("ownedById");
