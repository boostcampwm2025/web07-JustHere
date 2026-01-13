import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { GlobalExceptionsFilter } from '@/lib/logger/global-exception.filter'
import { LoggingInterceptor } from '@/lib/logger/logging.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalInterceptors(new LoggingInterceptor())
  app.useGlobalFilters(new GlobalExceptionsFilter())

  app.setGlobalPrefix('api')

  const config = new DocumentBuilder().setTitle('API Documentation').setDescription('The API description').setVersion('1.0').build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
