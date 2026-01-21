import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { KakaoService } from './kakao.service'
import { SearchKeywordDto } from './dto/search-keyword.dto'
import { KeywordResponseDto } from './dto/keyword-response.dto'

@ApiTags('kakao')
@Controller('kakao')
export class KakaoController {
  constructor(private readonly kakaoService: KakaoService) {}

  @Get('keyword')
  @ApiOperation({
    summary: 'Kakao 키워드로 장소 검색',
    description: 'Kakao Local API를 사용하여 키워드로 장소를 검색합니다.',
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: '검색할 키워드',
    example: '강남역 카페',
  })
  @ApiQuery({ name: 'roomId', required: false, description: '주변 검색 시 Room ID' })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: '반경거리 (m, 0~20000)',
    example: 5000,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호 (1-45, 기본값 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '페이지 크기 (1-15, 기본값 15)',
    example: 15,
  })
  @ApiResponse({
    status: 200,
    description: '검색 성공',
    type: KeywordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: 401,
    description: 'Kakao API 인증 실패',
  })
  @ApiResponse({
    status: 429,
    description: 'API 호출 한도 초과',
  })
  @ApiResponse({
    status: 502,
    description: 'Kakao API 호출 실패',
  })
  async searchByKeyword(@Query() dto: SearchKeywordDto): Promise<KeywordResponseDto> {
    return this.kakaoService.searchByKeyword(dto)
  }
}
