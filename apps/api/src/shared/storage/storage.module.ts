import { Global, Module } from "@nestjs/common";
import { config } from "../../common/config";
import { LocalStorageAdapter } from "./adapters/local-storage.adapter";
import { S3StorageAdapter } from "./adapters/s3-storage.adapter";
import { StorageController } from "./storage.controller";
import { STORAGE_ADAPTER, StorageService } from "./storage.service";

/**
 * Módulo de upload global: um único ponto de entrada de arquivos para toda a
 * API. O driver é escolhido por variável de ambiente, e os módulos de domínio
 * só falam com `StorageService`.
 */
@Global()
@Module({
  controllers: [StorageController],
  providers: [
    LocalStorageAdapter,
    S3StorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      inject: [LocalStorageAdapter, S3StorageAdapter],
      useFactory: (local: LocalStorageAdapter, s3: S3StorageAdapter) =>
        config.storage.driver === "s3" ? s3 : local,
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
