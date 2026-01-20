import { Component, type ReactNode } from 'react'
import { RoomNotFoundError } from '@/types/socket-error.types'
import ErrorPage from '@/pages/ErrorPage'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class RoomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error instanceof RoomNotFoundError) {
      return <ErrorPage errorType="room-not-found" onReset={this.handleReset} />
    }

    if (error) {
      return <ErrorPage onReset={this.handleReset} />
    }

    return this.props.children
  }
}
