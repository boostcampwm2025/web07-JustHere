import { ApiProperty } from '@nestjs/swagger';

export class KakaoPlaceDto {
  @ApiProperty({ description: '장소 ID' })
  id: string;

  @ApiProperty({ description: '장소명' })
  place_name: string;

  @ApiProperty({ description: '카테고리 이름' })
  category_name: string;

  @ApiProperty({ description: '카테고리 그룹 코드' })
  category_group_code: string;

  @ApiProperty({ description: '카테고리 그룹명' })
  category_group_name: string;

  @ApiProperty({ description: '전화번호' })
  phone: string;

  @ApiProperty({ description: '전체 지번 주소' })
  address_name: string;

  @ApiProperty({ description: '전체 도로명 주소' })
  road_address_name: string;

  @ApiProperty({ description: '경도(longitude)' })
  x: string;

  @ApiProperty({ description: '위도(latitude)' })
  y: string;

  @ApiProperty({ description: '장소 상세페이지 URL' })
  place_url: string;

  @ApiProperty({ description: '중심좌표까지의 거리 (m)', required: false })
  distance: string;
}

export class KakaoSameNameDto {
  @ApiProperty({ description: '질의어에서 인식된 지역 리스트', type: [String] })
  region: string[];

  @ApiProperty({ description: '질의어에서 지역 정보를 제외한 키워드' })
  keyword: string;

  @ApiProperty({ description: '인식된 지역 리스트 중 매칭된 지역 정보' })
  selected_region: string;
}

export class KakaoMetaDto {
  @ApiProperty({ description: '검색어에 검색된 문서 수' })
  total_count: number;

  @ApiProperty({ description: 'total_count 중 노출 가능 문서 수' })
  pageable_count: number;

  @ApiProperty({ description: '현재 페이지가 마지막 페이지인지 여부' })
  is_end: boolean;

  @ApiProperty({
    description: '질의어의 지역 및 키워드 분석 정보',
    type: KakaoSameNameDto,
  })
  same_name: KakaoSameNameDto;
}

export class KeywordResponseDto {
  @ApiProperty({ description: '검색 결과', type: [KakaoPlaceDto] })
  documents: KakaoPlaceDto[];

  @ApiProperty({ description: '메타 정보', type: KakaoMetaDto })
  meta: KakaoMetaDto;
}
