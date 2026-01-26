import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { Gauge } from 'prom-client'

@Injectable()
export class MetricService {
  constructor(@InjectMetric('canvas_ws_connections') private readonly connectionGauge: Gauge<string>) {}

  handleConnection(action: 'connect' | 'disconnect') {
    if (action === 'connect') {
      this.connectionGauge.inc()
    } else {
      this.connectionGauge.dec()
    }
  }
}
