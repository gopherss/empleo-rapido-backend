-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'PEN';

-- AlterTable
ALTER TABLE "WorkerProfile" ALTER COLUMN "currency" SET DEFAULT 'PEN';
