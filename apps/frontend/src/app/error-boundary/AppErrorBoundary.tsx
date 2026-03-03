import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
          <p className="text-lg font-semibold text-gray-700">앱을 불러오는 중 오류가 발생했습니다.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            새로고침
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
