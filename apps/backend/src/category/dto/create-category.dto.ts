import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({
    description: '방 Slug 또는 방 ID',
    example: 'a3k9m2x7',
    examples: {
      slug: { value: 'a3k9m2x7', description: 'Slug 형식' },
      uuid: { value: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID 형식' },
    },
  })
  @IsString()
  @IsNotEmpty()
  room_id: string

  @ApiProperty({
    description: '카테고리 이름',
    example: '카페',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string

  @ApiProperty({
    description: '사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string
}
