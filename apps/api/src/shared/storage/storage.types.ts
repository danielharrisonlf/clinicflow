export interface SignedUpload {
  /** URL para onde o cliente faz o PUT dos bytes. */
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
  /** Cabeçalhos que o PUT precisa repetir para a assinatura bater. */
  headers: Record<string, string>;
}

export interface ObjectMeta {
  objectKey: string;
  byteSize: number;
  mimeType: string;
}

/**
 * Contrato do armazenamento. Duas implementações: `local` (disco + URL assinada
 * pela própria API, para rodar sem cloud) e `s3` (presigned URL de verdade).
 * Os módulos de domínio só conhecem esta interface.
 */
export interface StorageAdapter {
  createUploadUrl(params: {
    objectKey: string;
    mimeType: string;
    byteSize: number;
  }): Promise<SignedUpload>;

  createReadUrl(objectKey: string): Promise<string>;

  head(objectKey: string): Promise<ObjectMeta | null>;

  remove(objectKey: string): Promise<void>;
}
