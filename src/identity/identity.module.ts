import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import {
  KYC_PROVIDER,
} from './kyc/kyc-provider.interface.js';
import { MockKycProvider } from './kyc/mock-kyc.provider.js';

@Module({
  controllers: [IdentityController],
  providers: [
    IdentityService,
    // Cambiar por el proveedor real cuando exista (Truora, MetaMap, etc.).
    { provide: KYC_PROVIDER, useClass: MockKycProvider },
  ],
})
export class IdentityModule {}
