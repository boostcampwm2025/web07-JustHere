import { Test, TestingModule } from '@nestjs/testing'
import { SwaggerService } from './swagger.service'
import { INestApplication } from '@nestjs/common'
import * as socketDocs from './swagger-socket.json'
// Mocking된 모듈을 import하여 검증에 사용
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

// 1. Mock 객체의 타입을 위한 인터페이스 정의
interface MockDocumentBuilder {
  setTitle: jest.Mock
  setDescription: jest.Mock
  setVersion: jest.Mock
  addTag: jest.Mock
  addCookieAuth: jest.Mock
  build: jest.Mock
}

interface MockSwaggerPathItem {
  post?: { summary: string }
  get?: { summary: string }
  [key: string]: any
}

interface MockSwaggerDocument {
  paths: Record<string, MockSwaggerPathItem>
}

jest.mock('@nestjs/swagger', () => {
  // 1. Mock 객체를 팩토리 내부에서 정의 (호이스팅 문제 해결)
  const mockDocumentBuilderInstance = {
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addTag: jest.fn().mockReturnThis(),
    addCookieAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  }

  return {
    // 생성자 호출 시 위에서 정의한 싱글톤 Mock 인스턴스를 반환하도록 설정
    DocumentBuilder: jest.fn(() => mockDocumentBuilderInstance),
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({ paths: {} }),
      setup: jest.fn(),
    },
  }
})

describe('SwaggerService', () => {
  let service: SwaggerService
  let mockApp: INestApplication

  beforeEach(async () => {
    // 테스트 간 Mock 상태 초기화
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [SwaggerService],
    }).compile()

    service = module.get<SwaggerService>(SwaggerService)
    mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      listen: jest.fn(),
    } as unknown as INestApplication
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  describe('setup', () => {
    it('Swagger 설정을 초기화하고 UI를 셋업해야 한다', () => {
      service.setup(mockApp)

      // 2. DocumentBuilder 인스턴스 획득 및 타입 단언
      const mockBuilderInstance = (DocumentBuilder as unknown as jest.Mock).mock.results[0].value as MockDocumentBuilder

      // 3. Import한 모듈을 통해 호출 검증
      expect(mockBuilderInstance.setTitle).toHaveBeenCalledWith('API Documentation')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(SwaggerModule.createDocument as jest.Mock).toHaveBeenCalledWith(mockApp, expect.anything())
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(SwaggerModule.setup as jest.Mock).toHaveBeenCalled()
    })

    it('socket-swagger.json의 이벤트를 Swagger 문서에 병합해야 한다', () => {
      // paths에 인덱스 시그니처가 있는 객체로 초기화 (unsafe-member-access 해결)
      const mockDocument: MockSwaggerDocument = { paths: {} }

      // 특정 테스트를 위한 리턴값 재설정
      ;(SwaggerModule.createDocument as jest.Mock).mockReturnValue(mockDocument)

      service.setup(mockApp)

      const eventCount = socketDocs.events.length
      expect(Object.keys(mockDocument.paths)).toHaveLength(eventCount)

      const firstEvent = socketDocs.events[0]
      const expectedPath = `/socket/${firstEvent.path}`

      expect(mockDocument.paths[expectedPath]).toBeDefined()
      // 타입 정의 덕분에 안전하게 접근 가능
      expect(mockDocument.paths[expectedPath].post?.summary).toContain(firstEvent.event)
    })
  })
})
