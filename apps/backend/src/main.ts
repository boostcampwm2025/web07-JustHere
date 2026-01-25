import { SwaggerConfigModule } from '@/lib/swagger/swagger.module'
import { SwaggerService } from '@/lib/swagger/swagger.service'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { AppModule } from './app.module'

async function bootstrap() {
  const sentryDsn = process.env.SENTRY_DSN
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.SENTRY_ENV ?? 'local',
      release: process.env.SENTRY_RELEASE,
    })
  }

  const app = await NestFactory.create(AppModule)

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
