import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

// 1. @prisma/client 모킹 (상속 구조 때문에 jest.mock 필수)
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $connect = jest.fn()
      $disconnect = jest.fn()
    },
  }
})

// 2. 내부에서 사용되는 외부 라이브러리 모킹
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({})),
}))

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(() => ({})),
}))

describe('PrismaService', () => {
  let service: PrismaService

  let mockPrisma: {
    $connect: jest.Mock
    $disconnect: jest.Mock
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    service = module.get<PrismaService>(PrismaService)

    mockPrisma = service as unknown as typeof mockPrisma
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  it('OnModuleInit에서 $connect를 호출해야 한다', async () => {
    await service.onModuleInit()

    expect(mockPrisma.$connect).toHaveBeenCalledTimes(1)
  })

  it('OnModuleDestroy에서 $disconnect를 호출해야 한다', async () => {
    await service.onModuleDestroy()

    expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1)
  })
})
