/**
 * Contrato de un proveedor de verificacion de identidad (KYC).
 *
 * En produccion se implementa con un tercero (Truora, MetaMap, Jumio, etc.)
 * o con un microservicio propio de vision. El resto de la app solo conoce
 * esta interfaz, por lo que cambiar de proveedor no afecta al dominio.
 */
export interface KycInput {
  dniNumber: string;
  dniFrontBuffer?: Buffer;
  selfieBuffer?: Buffer;
}

export interface KycResult {
  status: 'VERIFIED' | 'REJECTED';
  confidence: number;
  liveness: boolean;
  match: boolean;
  note?: string;
  ocr: {
    dniNumber: string;
    names?: string;
    birthDate?: string;
  };
}

export interface KycProvider {
  verify(input: KycInput): Promise<KycResult>;
}

/** Token de inyeccion del proveedor KYC. */
export const KYC_PROVIDER = 'KYC_PROVIDER';
