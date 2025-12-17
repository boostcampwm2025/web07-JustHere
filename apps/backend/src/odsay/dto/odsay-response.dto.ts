import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested, IsOptional } from 'class-validator';

export class PathInfoDto {
  @Expose()
  @IsNumber()
  totalTime: number; // 초 단위

  @Expose()
  @IsNumber()
  totalDistance: number; // 미터
}

export class StationDto {
  @Expose()
  @IsNumber()
  x: number; // 경도

  @Expose()
  @IsNumber()
  y: number; // 위도

  @Expose()
  @IsOptional()
  stationName?: string;

  @Expose()
  @IsOptional()
  stationID?: number;
}

export class PassStopListDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StationDto)
  stations: StationDto[];
}

export class SubPathDto {
  @Expose()
  @IsOptional()
  path?: string | Array<{ x: number; y: number }>;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => PassStopListDto)
  passStopList?: PassStopListDto;
}

export class PathDto {
  @Expose()
  @ValidateNested()
  @Type(() => PathInfoDto)
  info: PathInfoDto;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubPathDto)
  subPath: SubPathDto[];
}

export class OdsayResultDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathDto)
  path: PathDto[];
}

export class OdsayResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => OdsayResultDto)
  result: OdsayResultDto;
}
