import { IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsEnum(['CAR', 'PUBLIC_TRANSPORT'])
  transportMode: 'CAR' | 'PUBLIC_TRANSPORT';
}
