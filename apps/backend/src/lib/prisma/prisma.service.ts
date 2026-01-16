import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. pg 라이브러리로 Connection Pool 생성
    const connectionString = `${process.env.DATABASE_URL}`
    const pool = new Pool({ connectionString })

    // 2. Prisma 어댑터 생성
    const adapter = new PrismaPg(pool)

    // 3. 부모 클래스(PrismaClient)에 adapter 주입
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
