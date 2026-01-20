import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SearchKeywordDto {
  @ApiProperty({
    description: '검색 키워드',
    example: '맛집',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string

  @ApiPropertyOptional({ description: '주변 검색 시 Room ID' })
  @IsOptional()
  @IsString()
  roomId?: string

  @ApiPropertyOptional({ description: '검색 반경 (미터)', example: 2000, default: 2000 })
  @IsOptional()
  @IsNumber()
  radius?: number

  @ApiPropertyOptional({ description: '페이지 번호', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @ApiPropertyOptional({ description: '페이지당 결과 수', example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number
}
