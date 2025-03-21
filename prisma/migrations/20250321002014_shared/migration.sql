-- CreateTable
CREATE TABLE "SharedNote" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "noteId" INTEGER NOT NULL,

    CONSTRAINT "SharedNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedNote_url_key" ON "SharedNote"("url");

-- CreateIndex
CREATE INDEX "SharedNote_noteId_idx" ON "SharedNote"("noteId");

-- CreateIndex
CREATE INDEX "SharedNote_url_idx" ON "SharedNote"("url");

-- AddForeignKey
ALTER TABLE "SharedNote" ADD CONSTRAINT "SharedNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Notepad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
