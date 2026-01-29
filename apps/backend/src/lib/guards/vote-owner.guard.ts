import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { UserService } from '@/modules/user/user.service'
import { BasePayload } from '@/modules/vote/dto/vote.c2s.dto'
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Socket } from 'socket.io'
import { VoteService } from '@/modules/vote/vote.service'

@Injectable()
export class VoteOwnerGuard implements CanActivate {
  constructor(
    private readonly voteService: VoteService,
    private readonly userService: UserService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const wsContext = context.switchToWs()
    const client: Socket = wsContext.getClient()
    const payload: BasePayload = wsContext.getData() // C->S 페이로드

    const roomId = payload.roomId
    const categoryId = payload.categoryId
    if (!roomId) {
      throw new CustomException(ErrorType.BadRequest, 'roomId가 필요합니다.')
    }
    if (!categoryId) {
      throw new CustomException(ErrorType.BadRequest, 'categoryId가 필요합니다.')
    }

    const payloadUserId = payload.userId
    const dataUserId = (() => {
      const data = client.data as { userId?: unknown } | undefined
      if (!data) return undefined
      return typeof data.userId === 'string' ? data.userId : undefined
    })()
    if (payloadUserId && dataUserId && payloadUserId !== dataUserId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const clientSession = dataUserId ? this.userService.getSessionByUserIdInRoom(roomId, dataUserId) : this.userService.getSession(client.id)

    if (!clientSession || clientSession.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    // 2. 투표 세션 존재 여부 확인 (VoteService)
    // 투표 세션이 실제로 존재하는지 확인 (Optional)
    // 방장이 투표를 시작하려면 세션(WAITING 상태)이 이미 메모리에 있어야 함
    this.voteService.getSessionOrThrow(`${roomId}:${categoryId}`)

    // 3. 방장 권한 검증 (핵심)
    if (!clientSession.isOwner) {
      throw new CustomException(ErrorType.NotOwner, '방장 권한이 필요합니다.')
    }

    return true
  }
}
