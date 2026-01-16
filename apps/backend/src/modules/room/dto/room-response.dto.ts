import { ApiProperty } from '@nestjs/swagger'

export class RoomResponseDto {
  @ApiProperty({
    description: '방 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string

  @ApiProperty({
    description: '초대 링크용 고유 식별자',
    example: 'a3k9m2x7',
  })
  slug: string

  @ApiProperty({
    description: '경도 (x)',
    example: 127.027621,
  })
  x: number

  @ApiProperty({ description: '위도 (y)', example: 37.497952 })
  y: number

  @ApiProperty({ description: '장소명', example: '강남역', required: false })
  place_name?: string

  @ApiProperty({
    description: '생성 일시',
    example: '2026-01-13T10:30:00Z',
  })
  createdAt: Date

  @ApiProperty({
    description: '수정 일시',
    example: '2026-01-13T10:30:00Z',
  })
  updatedAt: Date
}
