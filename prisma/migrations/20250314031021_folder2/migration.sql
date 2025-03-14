-- AlterTable
ALTER TABLE "Notepad" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Notepad_order_idx" ON "Notepad"("order");
