import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class DeleteCategoryQueryDto {
  @ApiProperty({
    description: '방 Slug 또는 방 ID',
    example: 'a3k9m2x7',
    required: true,
    examples: {
      slug: { value: 'a3k9m2x7', description: 'Slug 형식' },
      uuid: { value: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID 형식' },
    },
  })
  @IsString()
  @IsNotEmpty()
  room_id: string

  @ApiProperty({
    description: '사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  user_id: string
}
