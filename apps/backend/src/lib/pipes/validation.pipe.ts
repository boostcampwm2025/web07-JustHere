import { ValidationPipe } from '@nestjs/common'

export const defaultValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})
