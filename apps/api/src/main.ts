import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  const globalPrefix = config.get<string>('API_GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('API_CORS_ORIGINS')?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (config.get<string>('NODE_ENV') !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('KimThanh Kindergarten API')
      .setDescription('Backend API for KimThanh Kindergarten platform')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${globalPrefix}/docs`, app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);
  console.warn(`[api] listening on http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
