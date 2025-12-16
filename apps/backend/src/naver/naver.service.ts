import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NaverGeocodingResponse } from '@web07/types';

@Injectable()
export class NaverService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://maps.apigw.ntruss.com/map-geocode/v2';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') as string;
    this.clientSecret = this.configService.get<string>(
      'NAVER_CLIENT_SECRET',
    ) as string;
  }

  async geocode(query: string): Promise<NaverGeocodingResponse> {
    const url = `${this.baseUrl}/geocode?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': this.clientId,
        'x-ncp-apigw-api-key': this.clientSecret,
      },
    });

    const data = await response.json();

    return data;
  }
}
