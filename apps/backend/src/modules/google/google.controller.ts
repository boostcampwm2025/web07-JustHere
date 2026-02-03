import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger'
import { GoogleService } from './google.service'
import { SearchTextDto } from './dto/search-text.dto'
import { GoogleSearchResponseDto, GooglePlaceDto } from './dto/google-place.dto'

@ApiTags('google')
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Google Places Text Search',
    description: 'Google Places API를 사용하여 텍스트로 장소를 검색합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '검색 성공',
    type: GoogleSearchResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: 'Google API 인증 실패' })
  @ApiResponse({ status: 429, description: 'API 호출 한도 초과' })
  @ApiResponse({ status: 502, description: 'Google API 호출 실패' })
  async searchText(@Body() dto: SearchTextDto): Promise<GoogleSearchResponseDto> {
    return this.googleService.searchText(dto)
  }

  @Get('places/:placeId')
  @ApiOperation({
    summary: 'Google Place Details',
    description: 'Google Places API를 사용하여 장소 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'placeId',
    description: 'Google Place ID',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: GooglePlaceDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '장소를 찾을 수 없음' })
  async getPlaceDetails(@Param('placeId') placeId: string): Promise<GooglePlaceDto> {
    return this.googleService.getPlaceDetails({ placeId })
  }

  @Get('photos/places/:placeId/photos/:photoId')
  @ApiOperation({
    summary: 'Google Place Photo',
    description: '장소 사진의 원본 URI를 반환합니다.',
  })
  @ApiParam({ name: 'placeId', description: 'Google Place ID' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiQuery({ name: 'maxWidthPx', required: false, description: '최대 너비 (px)', example: 400 })
  @ApiQuery({ name: 'maxHeightPx', required: false, description: '최대 높이 (px)', example: 400 })
  @ApiResponse({ status: 200, description: '사진 URI 반환' })
  async getPhoto(
    @Param('placeId') placeId: string,
    @Param('photoId') photoId: string,
    @Query('maxWidthPx') maxWidthPx?: number,
    @Query('maxHeightPx') maxHeightPx?: number,
  ): Promise<{ photoUri: string }> {
    const photoName = `places/${placeId}/photos/${photoId}`
    return this.googleService.getPhoto(photoName, maxWidthPx || 400, maxHeightPx || 400)
  }
}
