import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'

describe('Room API (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(async () => {
    // 테스트 후 생성된 방 정리
    await prisma.room.deleteMany()
  })

  describe('POST /room/create', () => {
    it('유효한 요청으로 방을 생성해야 한다 (201)', () => {
      return request(app.getHttpServer())
        .post('/room/create')
        .send({
          title: '우리 팀 모임',
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id')
          expect(res.body).toHaveProperty('slug')
          expect(res.body.slug).toHaveLength(8)
          expect(res.body.slug).toMatch(/^[a-z0-9]+$/)
          expect(res.body.title).toBe('우리 팀 모임')
          expect(res.body.x).toBe(127.027621)
          expect(res.body.y).toBe(37.497952)
          expect(res.body.place_name).toBe('강남역')
          expect(res.body).toHaveProperty('createdAt')
          expect(res.body).toHaveProperty('updatedAt')
        })
    })

    it('place_name 없이 방을 생성할 수 있어야 한다 (201)', () => {
      return request(app.getHttpServer())
        .post('/room/create')
        .send({
          title: '우리 팀 모임',
          x: 127.027621,
          y: 37.497952,
        })
        .expect(201)
        .expect(res => {
          expect(res.body.place_name).toBe('')
        })
    })

    it('여러 방을 생성하면 각각 다른 slug를 가져야 한다', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/room/create')
        .send({
          title: '방 1',
          x: 127.027621,
          y: 37.497952,
        })
        .expect(201)

      const res2 = await request(app.getHttpServer())
        .post('/room/create')
        .send({
          title: '방 2',
          x: 127.027621,
          y: 37.497952,
        })
        .expect(201)

      expect(res1.body.slug).not.toBe(res2.body.slug)
    })

    describe('Validation 에러', () => {
      it('title이 없으면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            x: 127.027621,
            y: 37.497952,
          })
          .expect(400)
      })

      it('title이 빈 문자열이면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: '',
            x: 127.027621,
            y: 37.497952,
          })
          .expect(400)
      })

      it('title이 100자를 초과하면 400 에러를 반환해야 한다', () => {
        const longTitle = 'a'.repeat(101)
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: longTitle,
            x: 127.027621,
            y: 37.497952,
          })
          .expect(400)
      })

      it('x가 없으면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: '우리 팀 모임',
            y: 37.497952,
          })
          .expect(400)
      })

      it('y가 없으면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: '우리 팀 모임',
            x: 127.027621,
          })
          .expect(400)
      })

      it('x가 숫자가 아니면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: '우리 팀 모임',
            x: '강남역',
            y: 37.497952,
          })
          .expect(400)
      })

      it('y가 숫자가 아니면 400 에러를 반환해야 한다', () => {
        return request(app.getHttpServer())
          .post('/room/create')
          .send({
            title: '우리 팀 모임',
            x: 127.027621,
            y: '강남역',
          })
          .expect(400)
      })
    })
  })
})
