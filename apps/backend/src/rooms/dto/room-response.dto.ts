import { Expose, Transform } from 'class-transformer';

export class RoomResponseDto {
  @Expose()
  id: number;

  @Expose()
  @Transform(({ value }): string => {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  })
  createdAt: string;
}
