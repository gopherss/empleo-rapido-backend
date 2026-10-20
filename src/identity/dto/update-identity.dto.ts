import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdateIdentityDto {
  @ApiProperty({
    example: '7654321',
    description: 'Numero de documento de identidad (solo digitos)',
  })
  @IsString()
  @Matches(/^\d{5,12}$/, {
    message: 'El DNI debe contener entre 5 y 12 digitos',
  })
  dniNumber!: string;
}

/** Archivos esperados en el formulario multipart de verificacion. */
export interface IdentityFiles {
  dniFront?: Express.Multer.File[];
  dniBack?: Express.Multer.File[];
  selfie?: Express.Multer.File[];
}
