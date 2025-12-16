import { Expose } from 'class-transformer';
import { MidpointCandidateResponseDto } from '@/midpoints/dto/midpoint-candidate-response.dto';

export class CalculateMidpointsResponseDto {
  @Expose()
  candidates: MidpointCandidateResponseDto[];

  @Expose()
  totalCount: number;
}
