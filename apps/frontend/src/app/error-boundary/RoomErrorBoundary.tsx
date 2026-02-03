import { Component, type ReactNode, type ErrorInfo } from 'react'
import * as Sentry from '@sentry/react'
import { RoomErrorPage } from '@/pages'
import { ERROR_TYPE, type ErrorType } from '@/shared/types'
import { reportError, isAppError } from '@/shared/utils'

type Props = {
  children: ReactNode
  onResetCleanup?: () => void | Promise<void>
}
type State = { error: Error | null; resetKey: number }

export class RoomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, resetKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Pick<State, 'error'> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })
  }

  handleReset = async () => {
    try {
      // 초기화 필요한 작업 수행
      await this.props.onResetCleanup?.()
    } catch (err) {
      reportError({ error: err, code: 'CLIENT_RESET_FAILED' })
    } finally {
      // resetKey 증가 → children을 key로 감싸서 완전 재마운트
      this.setState(prev => ({ error: null, resetKey: prev.resetKey + 1 }))
    }
  }

  render() {
    const { error, resetKey } = this.state

    if (error) {
      const { errorType } = getErrorPageConfig(error)
      return <RoomErrorPage errorType={errorType} errorMessage={error.message} onReset={this.handleReset} />
    }

    // key가 바뀌면 children 트리가 완전히 unmount → mount 됨
    return <div key={resetKey}>{this.props.children}</div>
  }
}

function getErrorPageConfig(error: Error): { errorType: ErrorType } {
  if (isAppError(error)) {
    switch (error.code) {
      case 'ROOM_NOT_FOUND':
      case 'NOT_FOUND':
      case 'TARGET_NOT_FOUND':
        return { errorType: ERROR_TYPE.ROOM_NOT_FOUND }
      case 'RESULT_NOT_FOUND':
        return { errorType: ERROR_TYPE.RESULT_NOT_FOUND }
      case 'RESULT_LOAD_FAILED':
        return { errorType: ERROR_TYPE.RESULT_LOAD_FAILED }
    }
  }

  return { errorType: ERROR_TYPE.UNKNOWN }
}
