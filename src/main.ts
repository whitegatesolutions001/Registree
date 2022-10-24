/* eslint-disable @typescript-eslint/no-var-requires */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from '@schematics/filters/http-exception.filter';
import { HideObjectPropertyInterceptor } from '@schematics/interceptors/hide-object-prop.interceptor';
import { JsonMaskInterceptor } from '@schematics/interceptors/json-mask.interceptor';
import { LoggingInterceptor } from '@schematics/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@schematics/interceptors/timeout.interceptor';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

const helmet = require('helmet');
const csurf = require('csurf');
dotenv.config();

async function bootstrap() {
  const port = process.env.PORT ?? 8080;
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('Registree API')
    .setDescription('The API for Registree')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'JWT',
    )
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(port);
  app.use(helmet());
  app.use(csurf());
  app.useGlobalInterceptors(new HideObjectPropertyInterceptor());
  app.useGlobalInterceptors(new JsonMaskInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TimeoutInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();
}
bootstrap();
