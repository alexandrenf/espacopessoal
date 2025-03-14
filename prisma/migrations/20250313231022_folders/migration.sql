-- AlterTable
ALTER TABLE "Notepad" ADD COLUMN     "isFolder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" INTEGER;

-- CreateIndex
CREATE INDEX "Notepad_parentId_idx" ON "Notepad"("parentId");

-- AddForeignKey
ALTER TABLE "Notepad" ADD CONSTRAINT "Notepad_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Notepad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
