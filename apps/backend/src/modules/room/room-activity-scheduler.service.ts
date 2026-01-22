import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { RoomRepository } from './room.repository'

@Injectable()
export class RoomActivitySchedulerService {
  private readonly logger = new Logger(RoomActivitySchedulerService.name)

  // In-Memory Buffer
  private activeRoomIds: Set<string> = new Set()

  // 만료 기준
  private readonly EXPIRATION_DAYS = 90

  constructor(private readonly roomRepository: RoomRepository) {}

  /**
   * 활동이 감지된 방 ID를 메모리에 적재
   */
  markAsActive(roomId: string) {
    this.activeRoomIds.add(roomId)
  }

  /**
   * [Scheduler 1] 매 시간 정각에 활동 기록을 DB에 일괄 반영 (Flush)
   */
  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'Asia/Seoul' })
  async flushActivityToDb() {
    if (this.activeRoomIds.size === 0) return

    // 현재 메모리에 있는 ID들을 배열로 복사하고 Set은 즉시 비움 (스냅샷)
    const idsToUpdate = Array.from(this.activeRoomIds)
    this.activeRoomIds.clear()

    const now = new Date()
    this.logger.debug(`Hourly Flushing: Updating activity for ${idsToUpdate.length} rooms...`)

    try {
      // Bulk Update
      await this.roomRepository.updateManyLastActiveAt(idsToUpdate, now)
      this.logger.log(`[Success] Activity flush complete.`)
    } catch (error) {
      this.logger.error('[Error] Failed to batch update room activity', error)
      // 실패 시 다음 텀에 다시 시도하도록 복구
      idsToUpdate.forEach(id => this.activeRoomIds.add(id))
    }
  }

  /**
   * [Scheduler 2] 매일 새벽 4시 즈음에 유령 방(Ghost Room) 정리
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: 'Asia/Seoul' })
  async cleanUpGhostRooms() {
    this.logger.log('Starting Ghost Room Cleanup...')

    const now = new Date()
    // 기준일: 현재 시간 - 90일
    const thresholdDate = new Date(now.setDate(now.getDate() - this.EXPIRATION_DAYS))

    try {
      const deletedCount = await this.roomRepository.deleteRoomsInactiveSince(thresholdDate)

      if (deletedCount > 0) {
        this.logger.log(`[Success] Deleted ${deletedCount} ghost rooms (inactive since ${thresholdDate.toISOString()}).`)
      } else {
        this.logger.log('[Error] No ghost rooms found to delete.')
      }
    } catch (error) {
      this.logger.error('[Error] Failed to cleanup ghost rooms', error)
    }
  }
}
