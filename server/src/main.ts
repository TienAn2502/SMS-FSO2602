import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';
import type { EnvConfig } from '@/common/config/env.schema';
import { setupApp } from '@/setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupApp(app);

  const configService = app.get(ConfigService<EnvConfig, true>);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
