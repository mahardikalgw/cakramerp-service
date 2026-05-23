import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: envConfig.corsOrigin,
    credentials: true,
  });
  await app.listen(envConfig.port);
}
bootstrap();
