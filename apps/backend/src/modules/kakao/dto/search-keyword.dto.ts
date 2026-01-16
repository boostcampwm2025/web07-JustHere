import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class SearchKeywordDto {
  @ApiProperty({
    description: '검색할 키워드',
    example: '강남역 카페',
  })
  @IsString()
  keyword: string

  @ApiProperty({
    required: false,
    description: '중심 좌표 경도',
    example: '127.027621',
  })
  @IsOptional()
  @IsString()
  x?: string

  @ApiProperty({
    required: false,
    description: '중심 좌표 위도',
    example: '37.497952',
  })
  @IsOptional()
  @IsString()
  y?: string

  @ApiProperty({
    required: false,
    description: '반경거리 (m)',
    minimum: 0,
    maximum: 20000,
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20000)
  radius?: number

  @ApiProperty({
    required: false,
    description: '페이지 번호',
    minimum: 1,
    maximum: 45,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(45)
  page?: number = 1

  @ApiProperty({
    required: false,
    description: '페이지 크기',
    minimum: 1,
    maximum: 15,
    default: 15,
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  size?: number = 15
}
