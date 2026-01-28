import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SearchTextDto {
  @ApiProperty({
    description: '검색 키워드',
    example: '강남역 맛집',
  })
  @IsString()
  @IsNotEmpty()
  textQuery: string

  @ApiPropertyOptional({ description: '주변 검색 시 Room ID' })
  @IsOptional()
  @IsString()
  roomId?: string

  @ApiPropertyOptional({ description: '검색 반경 (미터)', example: 2000, default: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number

  @ApiPropertyOptional({ description: '최대 결과 수', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxResultCount?: number

  @ApiPropertyOptional({ description: '다음 페이지 토큰 (페이지네이션)' })
  @IsOptional()
  @IsString()
  pageToken?: string
}
