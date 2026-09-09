import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import { config } from "../../../common/config";
import { AppException } from "../../../common/exceptions/app.exception";
import { ObjectMeta, SignedUpload, StorageAdapter } from "../storage.types";

/**
 * Armazenamento em disco com URL assinada pela própria API.
 *
 * Existe para o projeto rodar inteiro sem AWS nem MinIO: o contrato visto pelo
 * cliente é o mesmo do S3 (recebe uma URL, faz PUT, devolve o objectKey), então
 * trocar o driver não muda uma linha do módulo de documentos.
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly root = resolve(config.storage.localDir);

  async createUploadUrl(params: {
    objectKey: string;
    mimeType: string;
  }): Promise<SignedUpload> {
    const expiresAt = Date.now() + config.storage.uploadUrlTtlSeconds * 1000;
    const token = encodeKey(params.objectKey);
    const signature = sign("PUT", params.objectKey, expiresAt);

    return {
      uploadUrl: `/${config.apiPrefix}/uploads/local/${token}?exp=${expiresAt}&sig=${signature}`,
      objectKey: params.objectKey,
      expiresIn: config.storage.uploadUrlTtlSeconds,
      headers: { "content-type": params.mimeType },
    };
  }

  async createReadUrl(objectKey: string): Promise<string> {
    const expiresAt = Date.now() + config.storage.readUrlTtlSeconds * 1000;
    const token = encodeKey(objectKey);
    const signature = sign("GET", objectKey, expiresAt);
    return `/${config.apiPrefix}/uploads/local/${token}?exp=${expiresAt}&sig=${signature}`;
  }

  async head(objectKey: string): Promise<ObjectMeta | null> {
    try {
      const stats = await stat(this.pathOf(objectKey));
      return {
        objectKey,
        byteSize: stats.size,
        mimeType: "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async remove(objectKey: string): Promise<void> {
    await rm(this.pathOf(objectKey), { force: true });
  }

  async write(objectKey: string, data: Buffer): Promise<void> {
    const target = this.pathOf(objectKey);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  pathOf(objectKey: string): string {
    // O objectKey é gerado pela API (uuid + extensão da lista fechada), mas o
    // resolve() é a garantia de que nenhum "../" escape do diretório raiz.
    const target = resolve(join(this.root, objectKey));
    if (!target.startsWith(this.root)) {
      throw new AppException({
        code: "UPLOAD_SIGNATURE_INVALID",
        message: "Caminho de arquivo inválido.",
      });
    }
    return target;
  }
}

export function encodeKey(objectKey: string): string {
  return Buffer.from(objectKey, "utf-8").toString("base64url");
}

export function decodeKey(token: string): string {
  return Buffer.from(token, "base64url").toString("utf-8");
}

export function sign(
  method: string,
  objectKey: string,
  expiresAt: number,
): string {
  return createHmac("sha256", config.storage.signingSecret)
    .update(`${method}:${objectKey}:${expiresAt}`)
    .digest("base64url");
}

/** Comparação em tempo constante: assinatura conferida com `===` vaza por timing. */
export function verifySignature(
  method: string,
  objectKey: string,
  expiresAt: number,
  signature: string,
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(sign(method, objectKey, expiresAt));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
