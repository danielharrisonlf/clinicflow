import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { config } from "./common/config";

async function bootstrap(): Promise<void> {
  // Falha no boot, e não na primeira requisição, se faltar segredo em produção.
  config.requiredInProd();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix(config.apiPrefix, {
    // O HEALTHCHECK do contêiner e o painel de TV não deveriam depender de
    // acertar a versão do prefixo.
    exclude: ["health"],
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));

  app.enableCors({
    origin: config.isProd
      ? (config.corsOrigin.split(",").filter(Boolean) ?? false)
      : true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: false,
  });

  // O upload do driver local recebe bytes crus. Registrado só neste prefixo
  // para não transformar o corpo de todas as rotas em Buffer.
  app.use(
    `/${config.apiPrefix}/uploads/local`,
    express.raw({ type: () => true, limit: config.storage.maxFileBytes }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        // Sem coerção implícita: a conversão vem dos @Type() dos DTOs, para
        // "abc" em um campo numérico virar erro de validação, não NaN.
        enableImplicitConversion: false,
      },
    }),
  );

  // Prisma e os crons precisam fechar limpo quando o contêiner recebe SIGTERM.
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ClinicFlow AI — API")
    .setDescription(
      "Backend operacional da clínica: do agendamento ao retorno. " +
        "As tags seguem a numeração das telas do Penpot.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.port, config.host);

  logger.log("=======================================================");
  logger.log(
    `🚀 ClinicFlow API em http://localhost:${config.port}/${config.apiPrefix}`,
  );
  logger.log(`📚 Swagger em http://localhost:${config.port}/docs`);
  logger.log(`🗄️  Armazenamento: driver ${config.storage.driver}`);
  logger.log(
    `⏰ Jobs agendados: ${config.jobs.enabled ? "ativos" : "desligados"}`,
  );
  logger.log("=======================================================");
}

void bootstrap();
