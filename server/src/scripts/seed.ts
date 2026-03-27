import { NestFactory } from '@nestjs/core';
import { SeedModule } from '../modules/seed/seed.module';
import { SeedService } from '../modules/seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = app.get(SeedService);
    await seedService.run();
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
