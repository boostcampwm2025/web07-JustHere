import { Test, TestingModule } from '@nestjs/testing'
import { MetricService } from './metric.service'
import { getToken } from '@willsoto/nestjs-prometheus'

describe('MetricService', () => {
  let service: MetricService
  let mockGauge: { inc: jest.Mock; dec: jest.Mock }

  beforeEach(async () => {
    mockGauge = {
      inc: jest.fn(),
      dec: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricService,
        {
          provide: getToken('canvas_ws_connections'),
          useValue: mockGauge,
        },
      ],
    }).compile()

    service = module.get<MetricService>(MetricService)
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  describe('handleConnection', () => {
    it('connect 액션일 때 게이지를 증가시켜야 한다', () => {
      service.handleConnection('connect')
      expect(mockGauge.inc).toHaveBeenCalled()
      expect(mockGauge.dec).not.toHaveBeenCalled()
    })

    it('disconnect 액션일 때 게이지를 감소시켜야 한다', () => {
      service.handleConnection('disconnect')
      expect(mockGauge.dec).toHaveBeenCalled()
      expect(mockGauge.inc).not.toHaveBeenCalled()
    })
  })
})
