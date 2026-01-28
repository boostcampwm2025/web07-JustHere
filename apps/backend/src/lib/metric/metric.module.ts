import { Global, Module } from '@nestjs/common'
import { makeGaugeProvider } from '@willsoto/nestjs-prometheus'
import { MetricService } from './metric.service'

// @Global()을 붙이면 다른 모듈에서 imports: [MetricModule] 없이도 쓸 수 있음
// but, 명시적인 의존성을 적용할거면 빼기
@Global()
@Module({
  providers: [
    MetricService,
    makeGaugeProvider({
      name: 'canvas_ws_connections',
      help: 'Current number of connected WebSocket clients',
    }),
  ],
  exports: [MetricService],
})
export class MetricModule {}
