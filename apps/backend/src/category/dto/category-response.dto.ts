import { ApiProperty } from '@nestjs/swagger'

export class CategoryResponseDto {
  @ApiProperty({
    description: '카테고리 ID',
    example: 'f2d84f18-aee3-4395-a8e0-e97cbf15ed3a',
  })
  category_id: string

  @ApiProperty({
    description: '방 Slug 또는 방 ID',
    example: 'a3k9m2x7',
    examples: {
      slug: { value: 'a3k9m2x7', description: 'Slug 형식' },
      uuid: { value: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID 형식' },
    },
  })
  room_id: string

  @ApiProperty({
    description: '카테고리 이름',
    example: '카페',
  })
  name: string

  @ApiProperty({
    description: '순서',
    example: 1,
  })
  order: number

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date
}

export class DeleteCategoryResponseDto {
  @ApiProperty({
    description: '카테고리 ID',
    example: 'f2d84f18-aee3-4395-a8e0-e97cbf15ed3a',
  })
  category_id: string

  @ApiProperty({
    description: '삭제 일시',
    example: '2024-01-15T10:35:00Z',
  })
  deleted_at: Date
}
