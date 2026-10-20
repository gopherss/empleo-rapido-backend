-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BOB', 'USD', 'EUR', 'ARS', 'BRL', 'PEN', 'CLP', 'COP');

-- AlterTable
ALTER TABLE "WorkerProfile" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'BOB';
