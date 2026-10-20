import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  PORT = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '30d';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  UPLOAD_DIR = 'uploads';

  @IsString()
  @IsOptional()
  PRIVATE_UPLOAD_DIR = 'identity-docs';

  @IsString()
  @IsOptional()
  KYC_PROVIDER = 'mock';

  @IsString()
  @IsOptional()
  PUBLIC_BASE_URL = 'http://localhost:3000';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Configuracion invalida:\n${errors.toString()}`);
  }

  return validated;
}
