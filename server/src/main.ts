import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  json,
  urlencoded,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

function extractOriginsFromEnvValue(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      try {
        return [new URL(item).origin];
      } catch {
        return [];
      }
    });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('HTTP');
  const configuredOrigins = [
    ...extractOriginsFromEnvValue(process.env.CLIENT_URL),
    ...extractOriginsFromEnvValue(process.env.PUBLIC_APP_URL),
    ...extractOriginsFromEnvValue(process.env.TELEGRAM_WEBAPP_URL),
  ];
  const defaultOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'https://yaqin-market.uz',
    'https://www.yaqin-market.uz',
    'https://api.yaqin-market.uz',
  ];
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const rawRequestId = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(rawRequestId)
        ? rawRequestId[0]
        : rawRequestId
      )?.toString() || randomUUID();

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'SAMEORIGIN');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'permissions-policy',
      'camera=(), microphone=(), geolocation=(self)',
    );

    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms ${requestId}`,
      );
    });

    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedLocalOrigin =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowedOrigins.has(origin) || isAllowedLocalOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Telegram-Init-Data',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 204,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap()
  .then(() => {
    console.log('API is running on port ' + (process.env.PORT ?? 3000));
  })
  .catch((err) => {
    console.error('Failed to start API', err);
  });
