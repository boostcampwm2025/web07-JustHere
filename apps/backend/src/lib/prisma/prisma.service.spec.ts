import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

// 1. @prisma/client 모킹
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $connect = jest.fn()
      $disconnect = jest.fn()
    },
  }
})

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({})),
}))

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(() => ({})),
}))

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    service = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  it('OnModuleInit에서 $connect를 호출해야 한다', async () => {
    await service.onModuleInit()

    // eslint-disable-next-line `@typescript-eslint/unbound-method`
    expect(service.$connect as jest.Mock).toHaveBeenCalledTimes(1)
  })

  it('OnModuleDestroy에서 $disconnect를 호출해야 한다', async () => {
    await service.onModuleDestroy()

    // eslint-disable-next-line `@typescript-eslint/unbound-method`
    expect(service.$disconnect as jest.Mock).toHaveBeenCalledTimes(1)
  })
})
