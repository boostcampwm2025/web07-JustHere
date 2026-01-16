import { SwaggerConfigModule } from '@/lib/swagger/swagger.module'
import { SwaggerService } from '@/lib/swagger/swagger.service'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { GlobalExceptionsFilter } from '@/lib/logger/global-exception.filter'
import { HttpLoggingInterceptor } from '@/lib/logger/http-logging.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalInterceptors(new HttpLoggingInterceptor())
  app.useGlobalFilters(new GlobalExceptionsFilter())

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  const swaggerModule = app.select(SwaggerConfigModule)
  const swaggerService = swaggerModule.get(SwaggerService)
  swaggerService.setup(app)

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
