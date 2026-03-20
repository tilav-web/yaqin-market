import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
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
