import { Global, Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

/**
 * Global: quase todo módulo precisa da tolerância de atraso ou da duração
 * padrão, e propagar esse import por doze módulos só produziria ruído.
 */
@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
