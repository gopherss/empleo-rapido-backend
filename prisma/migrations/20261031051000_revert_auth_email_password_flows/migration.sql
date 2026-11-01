-- Elimina notificaciones con los tipos que se retiran
DELETE FROM "Notification" WHERE "type" IN ('APPLICATION_WITHDRAWN', 'JOB_CANCELLED');

-- AlterEnum: recrea el enum sin los valores retirados
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'JOB_COMPLETED', 'AGREEMENT_CONFIRMED', 'NEW_MESSAGE');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
DROP TYPE "NotificationType_old";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";

-- DropTable
DROP TABLE "PasswordResetToken";
DROP TABLE "EmailVerificationToken";
DROP TABLE "EmailChangeToken";
