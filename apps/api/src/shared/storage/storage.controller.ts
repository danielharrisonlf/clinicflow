import { createReadStream } from "node:fs";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { AppException } from "../../common/exceptions/app.exception";
import {
  decodeKey,
  LocalStorageAdapter,
  verifySignature,
} from "./adapters/local-storage.adapter";
import {
  ConfirmUploadDto,
  CreateUploadUrlDto,
} from "./dto/create-upload-url.dto";
import { StorageService } from "./storage.service";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly localAdapter: LocalStorageAdapter,
  ) {}

  @Post("sign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Emitir URL assinada para o envio do arquivo",
    description:
      "Valida formato e tamanho antes de o arquivo existir. Devolve `uploadUrl` (PUT) e `objectKey`; " +
      "o cliente envia os bytes para a uploadUrl e depois manda só o objectKey em POST /documents.",
  })
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.storageService.createUploadUrl(dto);
  }

  @Post("confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar que o arquivo chegou ao armazenamento" })
  confirm(@Body() dto: ConfirmUploadDto) {
    return this.storageService.confirmUpload(dto.objectKey);
  }

  // Rotas do driver local (públicas com autorização via assinatura HMAC da URL).

  @Public()
  @Put("local/:token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Receber os bytes (driver local; equivale ao PUT no S3)",
  })
  async uploadLocal(
    @Param("token") token: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
    @Req() request: Request,
  ): Promise<{ objectKey: string; byteSize: number }> {
    const objectKey = decodeKey(token);
    assertSignature("PUT", objectKey, exp, sig);

    // `express.raw` registrado no main.ts para este prefixo: o corpo chega como Buffer.
    const body = request.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new AppException({
        code: "UPLOAD_NOT_FOUND",
        message: "Corpo do upload vazio.",
      });
    }

    await this.localAdapter.write(objectKey, body);
    return { objectKey, byteSize: body.length };
  }

  @Public()
  @Get("local/:token")
  @ApiOperation({
    summary: "Servir o arquivo (driver local; equivale ao GET assinado do S3)",
  })
  async downloadLocal(
    @Param("token") token: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
  ): Promise<StreamableFile> {
    const objectKey = decodeKey(token);
    assertSignature("GET", objectKey, exp, sig);

    const meta = await this.localAdapter.head(objectKey);
    if (!meta) {
      throw AppException.notFound("Arquivo", objectKey);
    }

    return new StreamableFile(
      createReadStream(this.localAdapter.pathOf(objectKey)),
      {
        type: mimeOf(objectKey),
        disposition: `inline; filename="${objectKey.split("/").at(-1) ?? "arquivo"}"`,
      },
    );
  }
}

function assertSignature(
  method: string,
  objectKey: string,
  exp: string,
  sig: string,
): void {
  if (!verifySignature(method, objectKey, Number(exp), sig ?? "")) {
    throw new AppException({
      code: "UPLOAD_SIGNATURE_INVALID",
      message: "Link de arquivo inválido ou expirado.",
      status: HttpStatus.FORBIDDEN,
    });
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function mimeOf(objectKey: string): string {
  const extension = objectKey.split(".").at(-1)?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}
