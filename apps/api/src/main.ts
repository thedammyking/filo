import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from '@/modules/app/app.module';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  app.use(helmet());
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1'
  });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Filo API')
    .setDescription('The Filo API description')
    .setVersion('1.0')
    .addTag('storage', 'Storage provider operations')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(PORT);
}

bootstrap();
