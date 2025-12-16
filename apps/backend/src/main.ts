import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix 설정
  app.setGlobalPrefix('api');

  // 프로덕션 환경에서 CORS 설정
  // 개발 환경은 Vite 프록시 사용
  if (process.env.NODE_ENV === 'production') {
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 인스턴스로 자동 변환
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
