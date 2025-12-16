import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

export class RouteSummaryDto {
  @Expose()
  @IsNumber()
  distance: number; // 미터

  @Expose()
  @IsNumber()
  duration: number; // 밀리초
}

export class RoadDto {
  @Expose()
  @IsArray()
  @IsNumber({}, { each: true })
  vertexes: number[]; // [lng, lat, lng, lat, ...] 형식
}

export class SectionDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoadDto)
  roads: RoadDto[];
}

export class RouteDto {
  @Expose()
  @ValidateNested()
  @Type(() => RouteSummaryDto)
  summary: RouteSummaryDto;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];
}

export class KakaoDirectionsResponseDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteDto)
  routes: RouteDto[];
}
