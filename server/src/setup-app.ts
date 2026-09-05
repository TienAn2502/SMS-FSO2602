import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { RequestIdInterceptor } from '@/common/interceptors/request-id.interceptor';
import { ResponseWrapperInterceptor } from '@/common/interceptors/response-wrapper.interceptor';
import type { EnvConfig } from '@/common/config/env.schema';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IncomingMessage, Server, ServerResponse } from 'http';

export function setupApp(
  app: NestExpressApplication<
    Server<typeof IncomingMessage, typeof ServerResponse>
  >,
): void {
  const configService = app.get(ConfigService<EnvConfig, true>);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  app.enableCors({
    // origin: configService.get('CORS_ORIGIN', { infer: true }),
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new ResponseWrapperInterceptor(),
  );

  app.set('trust proxy', 1); // Lấy IP user thay vì web server như nginx, cloudflare

  const swaggerConfig = new DocumentBuilder()
    .setTitle('eSchool SaaS API')
    .setDescription('Tài liệu REST API — eSchool SaaS')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
