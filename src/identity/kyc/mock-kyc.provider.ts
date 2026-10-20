import { Injectable } from '@nestjs/common';
import type {
  KycInput,
  KycProvider,
  KycResult,
} from './kyc-provider.interface.js';

/**
 * Proveedor KYC simulado para desarrollo.
 *
 * "Aprueba" la verificacion cuando el DNI tiene al menos 7 digitos y se
 * enviaron el frente del documento y la selfie. Simula la latencia y el
 * resultado (liveness + match + OCR) de un proveedor real.
 */
@Injectable()
export class MockKycProvider implements KycProvider {
  async verify(input: KycInput): Promise<KycResult> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const digits = input.dniNumber.replace(/\D/g, '');
    const ok =
      digits.length >= 7 &&
      Boolean(input.dniFrontBuffer) &&
      Boolean(input.selfieBuffer);

    return {
      status: ok ? 'VERIFIED' : 'REJECTED',
      confidence: ok ? 0.96 : 0.2,
      liveness: ok,
      match: ok,
      note: ok ? undefined : 'No se pudo validar el documento o la selfie.',
      ocr: { dniNumber: input.dniNumber },
    };
  }
}
