import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length, IsNumber, IsOptional } from 'class-validator'

export class CreateRoomDto {
  @ApiProperty({
    description: '방 제목',
    example: '우리 팀 모임',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string

  @ApiProperty({
    description: '경도 (longitude)',
    example: 127.027621,
  })
  @IsNumber()
  x: number

  @ApiProperty({
    description: '위도 (latitude)',
    example: 37.497952,
  })
  @IsNumber()
  y: number

  @ApiProperty({
    description: '장소명 (선택)',
    example: '강남역',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @Length(0, 255)
  place_name?: string
}
