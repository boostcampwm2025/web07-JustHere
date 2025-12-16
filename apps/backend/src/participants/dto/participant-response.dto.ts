import { Expose, Transform } from 'class-transformer';

export class ParticipantResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  address: string;

  @Expose()
  lat: number;

  @Expose()
  lng: number;

  @Expose()
  transportMode: 'CAR' | 'PUBLIC_TRANSPORT';

  @Expose()
  @Transform(({ value }): string => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  })
  createdAt: string;
}
