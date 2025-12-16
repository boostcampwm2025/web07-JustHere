import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

export class PathInfoDto {
  @Expose()
  @IsNumber()
  totalTime: number; // 초 단위

  @Expose()
  @IsNumber()
  totalDistance: number; // 미터
}

export class SubPathDto {
  @Expose()
  path: string | Array<{ x: number; y: number }> | undefined;
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
