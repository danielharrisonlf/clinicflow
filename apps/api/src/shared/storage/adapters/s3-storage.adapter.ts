import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { config } from "../../../common/config";
import { ObjectMeta, SignedUpload, StorageAdapter } from "../storage.types";

/**
 * Armazenamento S3-compatível (AWS, MinIO, R2) por URL assinada.
 *
 * Os bytes nunca passam pelo processo Node: um laudo de 8 MB não ocupa um
 * worker do Nest, que continua respondendo o painel do dia enquanto o upload
 * acontece direto contra o bucket.
 */
@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket = config.storage.s3.bucket;

  constructor() {
    const { endpoint, region, accessKeyId, secretAccessKey, forcePathStyle } =
      config.storage.s3;
    this.client = new S3Client({
      region,
      // Endpoint vazio = AWS, e o SDK resolve o host pela região.
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  async createUploadUrl(params: {
    objectKey: string;
    mimeType: string;
    byteSize: number;
  }): Promise<SignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.objectKey,
      ContentType: params.mimeType,
      ContentLength: params.byteSize,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: config.storage.uploadUrlTtlSeconds,
    });

    return {
      uploadUrl,
      objectKey: params.objectKey,
      expiresIn: config.storage.uploadUrlTtlSeconds,
      // O Content-Type entra na assinatura: o S3 recusa um PUT que divirja daqui.
      headers: { "content-type": params.mimeType },
    };
  }

  async createReadUrl(objectKey: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      {
        expiresIn: config.storage.readUrlTtlSeconds,
      },
    );
  }

  async head(objectKey: string): Promise<ObjectMeta | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return {
        objectKey,
        byteSize: result.ContentLength ?? 0,
        mimeType: result.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async remove(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }
}
