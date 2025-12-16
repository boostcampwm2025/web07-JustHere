import { Expose, Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class KakaoPlaceDocumentDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  place_name: string;

  @Expose()
  @IsString()
  address_name: string;

  @Expose()
  @IsString()
  road_address_name: string;

  @Expose()
  @IsString()
  category_name: string;

  @Expose()
  @IsString()
  x: string; // 경도

  @Expose()
  @IsString()
  y: string; // 위도
}

export class KakaoPlacesResponseDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KakaoPlaceDocumentDto)
  documents: KakaoPlaceDocumentDto[];
}
