import { Expose, Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested, IsOptional } from 'class-validator';

export class KakaoAddressDocumentDto {
  @Expose()
  @IsString()
  address_name: string;

  @Expose()
  @IsOptional()
  @IsString()
  road_address_name?: string;

  @Expose()
  @IsString()
  x: string; // 경도

  @Expose()
  @IsString()
  y: string; // 위도
}

export class KakaoAddressResponseDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KakaoAddressDocumentDto)
  documents: KakaoAddressDocumentDto[];
}
