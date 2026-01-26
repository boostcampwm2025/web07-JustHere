import { useNavigate } from 'react-router-dom'
import { AlertCircleIcon } from '@/shared/assets'
import { Button, Header } from '@/shared/components'

type ErrorType = 'room-not-found' | 'unknown'

type ErrorMessage = {
  title: string
  description: string
}

const errorMessages: Record<ErrorType, ErrorMessage> = {
  'room-not-found': {
    title: '방을 찾을 수 없습니다',
    description: '존재하지 않거나 삭제된 방입니다.',
  },
  unknown: {
    title: '오류가 발생했습니다',
    description: '잠시 후 다시 시도해주세요.',
  },
}

interface ErrorPageProps {
  errorType?: ErrorType
  onReset?: () => void
}

export default function RoomErrorPage({ errorType = 'unknown', onReset }: ErrorPageProps) {
  const navigate = useNavigate()

  const error = errorMessages[errorType ?? 'unknown']

  const handleCreateRoom = () => navigate('/onboarding')
  const handleReset = () => onReset?.()

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-bg px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="size-24 mb-6 rounded-full bg-primary-bg flex items-center justify-center">
            <AlertCircleIcon className="size-24 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">{error.title}</h1>
          <h3 className="text-gray text-lg mb-8">{error.description}</h3>

          {errorType === 'room-not-found' ? (
            <Button onClick={handleCreateRoom} size="lg">
              새 방 만들기
            </Button>
          ) : (
            <Button onClick={handleReset} size="lg">
              새로고침
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
