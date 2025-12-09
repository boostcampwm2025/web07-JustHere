import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
