import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdVerificationStatus } from '../../generated/prisma/enums.js';

function maskDni(dni: string | null): string | null {
  if (!dni) return null;
  if (dni.length <= 2) return dni;
  return `${'*'.repeat(dni.length - 2)}${dni.slice(-2)}`;
}

interface IdentityUserModel {
  dniNumber: string | null;
  dniFrontPath: string | null;
  dniBackPath: string | null;
  selfiePath: string | null;
  idVerificationStatus: IdVerificationStatus;
  idVerifiedAt: Date | null;
  idVerificationNote: string | null;
}

export class IdentityStatusDto {
  @ApiProperty({ enum: IdVerificationStatus })
  status!: IdVerificationStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'DNI enmascarado (solo los ultimos digitos)',
  })
  dniNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  verifiedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ description: 'Si ya se subieron los documentos' })
  hasDocuments!: boolean;

  static fromUser(user: IdentityUserModel): IdentityStatusDto {
    return {
      status: user.idVerificationStatus,
      dniNumber: maskDni(user.dniNumber),
      verifiedAt: user.idVerifiedAt,
      note: user.idVerificationNote,
      hasDocuments: Boolean(
        user.dniFrontPath && user.dniBackPath && user.selfiePath,
      ),
    };
  }
}
