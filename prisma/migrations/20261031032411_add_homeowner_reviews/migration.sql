-- CreateTable
CREATE TABLE "HomeownerReview" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeownerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeownerReview_jobId_key" ON "HomeownerReview"("jobId");

-- CreateIndex
CREATE INDEX "HomeownerReview_targetId_idx" ON "HomeownerReview"("targetId");

-- AddForeignKey
ALTER TABLE "HomeownerReview" ADD CONSTRAINT "HomeownerReview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerReview" ADD CONSTRAINT "HomeownerReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerReview" ADD CONSTRAINT "HomeownerReview_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
