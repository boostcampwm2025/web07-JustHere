import { Component, type ReactNode } from 'react'
import { RoomErrorPage } from '@/pages'
import { RoomNotFoundError } from './SocketError'

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

  handleReset = async () => {
    try {
      // 초기화 필요한 작업 수행
      await this.props.onResetCleanup?.()
    } catch (err) {
      console.error(err)
    } finally {
      // resetKey 증가 → children을 key로 감싸서 완전 재마운트
      this.setState(prev => ({ error: null, resetKey: prev.resetKey + 1 }))
    }
  }

  render() {
    const { error, resetKey } = this.state

    if (error instanceof RoomNotFoundError) {
      return <RoomErrorPage errorType="room-not-found" />
    }

    if (error) {
      return <RoomErrorPage onReset={this.handleReset} />
    }

    // key가 바뀌면 children 트리가 완전히 unmount → mount 됨
    return <div key={resetKey}>{this.props.children}</div>
  }
}
