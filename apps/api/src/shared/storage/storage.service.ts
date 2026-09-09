import { Inject, Injectable } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../common/config";
import { AppException } from "../../common/exceptions/app.exception";
import type { ObjectMeta, SignedUpload, StorageAdapter } from "./storage.types";

export const STORAGE_ADAPTER = "STORAGE_ADAPTER";

/**
 * Lista fechada de formatos. Fechada de propósito: a recepção anexa laudo,
 * atestado e exame — tudo PDF ou foto do papel. Aceitar mais do que isso é
 * aceitar executável no repositório clínico.
 */
const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadPurpose = "DOCUMENT";

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_ADAPTER) private readonly adapter: StorageAdapter,
  ) {}

  /**
   * Emite a URL de upload depois de validar formato e tamanho.
   *
   * O limite de 10 MB é conferido aqui, antes de o arquivo existir — é o que
   * produz mensagem de validação imediata em vez de um timeout no meio do envio.
   */
  async createUploadUrl(params: {
    purpose: UploadPurpose;
    fileName: string;
    mimeType: string;
    byteSize: number;
  }): Promise<SignedUpload> {
    const extension = ALLOWED_MIME[params.mimeType];
    if (!extension) {
      throw new AppException({
        code: "UNSUPPORTED_MIME",
        message: `Formato não aceito. Envie PDF, JPEG, PNG ou WebP.`,
        details: {
          received: params.mimeType,
          allowed: Object.keys(ALLOWED_MIME),
        },
      });
    }

    if (params.byteSize > config.storage.maxFileBytes) {
      const limitMb = Math.round(config.storage.maxFileBytes / (1024 * 1024));
      throw new AppException({
        code: "FILE_TOO_LARGE",
        message: `${params.fileName} passa do limite de ${limitMb} MB. Comprima o arquivo ou envie as páginas separadamente.`,
        details: {
          byteSize: params.byteSize,
          maxBytes: config.storage.maxFileBytes,
        },
      });
    }

    const objectKey = buildObjectKey(params.purpose, extension);
    return this.adapter.createUploadUrl({
      objectKey,
      mimeType: params.mimeType,
      byteSize: params.byteSize,
    });
  }

  /**
   * Confere que o objeto existe no bucket e devolve o tamanho real.
   *
   * O `byteSize` do banco vem daqui, nunca do que o cliente declarou: um
   * cliente que mente no `byteSize` do sign burlaria o limite de 10 MB.
   */
  async confirmUpload(objectKey: string): Promise<ObjectMeta> {
    const meta = await this.adapter.head(objectKey);
    if (!meta) {
      throw new AppException({
        code: "UPLOAD_NOT_FOUND",
        message: "O arquivo não chegou ao armazenamento. Tente enviar de novo.",
      });
    }
    if (meta.byteSize > config.storage.maxFileBytes) {
      await this.adapter.remove(objectKey);
      const limitMb = Math.round(config.storage.maxFileBytes / (1024 * 1024));
      throw new AppException({
        code: "FILE_TOO_LARGE",
        message: `Arquivo acima do limite de ${limitMb} MB.`,
      });
    }
    return meta;
  }

  createReadUrl(objectKey: string): Promise<string> {
    return this.adapter.createReadUrl(objectKey);
  }

  remove(objectKey: string): Promise<void> {
    return this.adapter.remove(objectKey);
  }
}

function buildObjectKey(purpose: UploadPurpose, extension: string): string {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${purpose.toLowerCase()}s/${folder}/${uuidv7()}.${extension}`;
}

/** Palpite de classificação pelo nome do arquivo, editável posteriormente. */
export function guessDocumentType(fileName: string): DocumentType {
  const name = fileName.toLowerCase();
  if (name.includes("atestado")) return DocumentType.ATESTADO;
  if (name.includes("encaminhamento") || name.includes("guia"))
    return DocumentType.ENCAMINHAMENTO;
  if (name.includes("laudo")) return DocumentType.LAUDO;
  if (name.includes("receita")) return DocumentType.RECEITA;
  if (
    name.includes("raio") ||
    name.includes("torax") ||
    name.includes("ressonanc")
  ) {
    return DocumentType.EXAME_IMAGEM;
  }
  if (name.includes("hemograma") || name.includes("exame"))
    return DocumentType.EXAME_LABORATORIAL;
  return DocumentType.OUTRO;
}
