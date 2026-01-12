import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import type { Server } from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // NestJS의 기본 HTTP 서버 가져오기 (타입 명시)
  const httpServer = app.getHttpServer() as Server;

  // Y.js WebSocket 서버를 NestJS HTTP 서버에 연결
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/yjs',
  });

  wss.on('connection', (ws, req) => {
    console.log(`✅ 새로운 Y.js 연결: ${req.url}`);
    setupWSConnection(ws, req);

    ws.on('close', () => {
      console.log(`❌ Y.js 연결 종료: ${req.url}`);
    });

    ws.on('error', (error) => {
      console.error(`⚠️  Y.js WebSocket 에러:`, error);
    });
  });
}
bootstrap();
