import { INestApplication, Injectable } from '@nestjs/common'
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger'

// tsconfig.json에서 "resolveJsonModule": true 설정이 필요합니다.
import * as socketDocs from './swagger-socket.json'

// JSON 파일 내부 구조에 맞춘 타입 정의
interface SocketEvent {
  operationId: string
  path: string
  event: string
  tags: string[]
  description: string
  request: Record<string, any>
  response: Record<string, any>
}

@Injectable()
export class SwaggerService {
  constructor() {}

  setup(app: INestApplication) {
    const path = 'api-docs'
    // 환경 변수 등으로 제어하려면 여기에 로직 추가
    const enable = true

    if (!enable) return

    // 1. 기본 Swagger 설정 (REST API 등)
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('REST API & Socket.IO Events Specification')
      .setVersion('1.0')
      .addTag('REST API', 'HTTP REST API 엔드포인트')
      .addTag('Socket.IO Events', 'WebSocket 이벤트 (문서용)')
      // 쿠키 인증 설정 (필요 시)
      .addCookieAuth('SID', {
        type: 'apiKey',
        in: 'cookie',
        name: 'SID',
        description: 'Session ID Cookie',
      })
      .build()

    const document: OpenAPIObject = SwaggerModule.createDocument(app, config)

    // 2. Socket.IO 이벤트 문서를 Swagger에 병합
    const events = socketDocs.events as SocketEvent[]

    for (const event of events) {
      // Swagger UI에서 경로처럼 보이게 하기 위해 prefix 추가
      // 예: room:join -> /socket/room:join
      const fakePath = `/socket/${event.path}`

      // document.paths 객체가 없는 경우 초기화
      if (!document.paths) {
        document.paths = {}
      }

      document.paths[fakePath] = {
        // Socket emit을 표현하기 위해 POST 메서드로 매핑
        post: {
          tags: event.tags || ['Socket.IO Events'],
          summary: `[Socket.IO] ${event.event}`,
          description: event.description,
          operationId: event.operationId || event.event,

          // 보안 설정 (필요에 따라 주석 해제 또는 로직 추가)
          // security: [{ SID: [] }],

          // 요청 데이터 (Client -> Server)
          requestBody: {
            required: true,
            description: 'Socket.emit Payload',
            content: {
              'application/json': {
                // JSON 파일의 request 객체를 그대로 스키마로 사용
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                schema: event.request as any,
              },
            },
          },

          // 응답 데이터 (Server -> Client / Broadcast)
          responses: {
            '200': {
              description: 'Socket Response / Broadcast Event',
              content: {
                'application/json': {
                  // JSON 파일의 response 객체를 그대로 스키마로 사용
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  schema: event.response as any,
                },
              },
            },
          },
        },
      }
    }

    // 3. Swagger UI 셋업
    SwaggerModule.setup(path, app, document, {
      swaggerOptions: {
        // 소켓 이벤트 태그를 기본적으로 펼쳐서 보여줄지 설정
        defaultModelsExpandDepth: -1,
        persistAuthorization: true,
      },
    })
  }
}
