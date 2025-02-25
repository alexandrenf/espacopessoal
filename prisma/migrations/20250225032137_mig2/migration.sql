/*
  Warnings:

  - A unique constraint covering the columns `[ownedById]` on the table `UserThings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserThings_ownedById_key" ON "UserThings"("ownedById");
