import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OdsayTransitResponse } from '@web07/types';

@Injectable()
export class OdsayService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.odsay.com/v1/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ODSAY_API_KEY') as string;
  }

  async searchTransitRoute(
    sx: number,
    sy: number,
    ex: number,
    ey: number,
  ): Promise<OdsayTransitResponse> {
    const url = `${this.baseUrl}/searchPubTransPathT?SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${this.apiKey}`;

    const response = await fetch(url);
    return response.json();
  }
}
