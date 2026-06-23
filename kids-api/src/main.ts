import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { EnvService } from "./config/env.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const env = app.get(EnvService);

  app.use(helmet());
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.setGlobalPrefix(env.get("API_GLOBAL_PREFIX"));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (!env.isProd) {
    const config = new DocumentBuilder()
      .setTitle("KimThanh Kids API")
      .setDescription("Multi-tenant SaaS backend: platform billing + preschool domain API A-G")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.get("API_PORT"));
  // eslint-disable-next-line no-console
  console.log(
    `kids-api chạy tại http://localhost:${env.get("API_PORT")}/${env.get("API_GLOBAL_PREFIX")}`,
  );
}

void bootstrap();
