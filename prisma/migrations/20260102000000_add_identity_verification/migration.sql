-- CreateEnum
CREATE TYPE "IdVerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "dniNumber" TEXT,
    ADD COLUMN "dniFrontPath" TEXT,
    ADD COLUMN "dniBackPath" TEXT,
    ADD COLUMN "selfiePath" TEXT,
    ADD COLUMN "idVerificationStatus" "IdVerificationStatus" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "idVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "idVerificationNote" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_dniNumber_key" ON "User"("dniNumber");
