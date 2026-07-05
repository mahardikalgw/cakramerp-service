import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ── Structured logging ──────────────────────────────
  app.useLogger(app.get(Logger));

  // ── API versioning ──────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // ── Security ────────────────────────────────────────
  app.use(helmet());

  // ── Compression ─────────────────────────────────────
  app.use(
    compression({
      threshold: 1024, // Only compress responses > 1KB
    }),
  );

  // ── Validation ──────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Global exception filter ─────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── CORS ────────────────────────────────────────────
  const allowedOrigins = envConfig.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  // ── Graceful shutdown ───────────────────────────────
  app.enableShutdownHooks();

  // ── Database migrations ─────────────────────────────
  // Run migrations automatically and block startup until they complete.
  // This ensures the schema is up-to-date before the app accepts traffic.
  const dataSource = app.get(DataSource);
  try {
    const migrations = await dataSource.runMigrations({ transaction: 'each' });
    if (migrations.length === 0) {
      app.get(Logger).log('No pending database migrations.');
    } else {
      app.get(Logger).log(`Applied ${migrations.length} database migration(s):`);
      for (const migration of migrations) {
        app.get(Logger).log(`  ✓ ${migration.name}`);
      }
    }
  } catch (error) {
    app.get(Logger).error('Database migration failed', error as Error);
    await app.close();
    process.exit(1);
  }

  await app.listen(envConfig.port);

  const logger = app.get(Logger);
  logger.log(
    `Application running on port ${envConfig.port} [${envConfig.nodeEnv}]`,
  );
}

void bootstrap();
