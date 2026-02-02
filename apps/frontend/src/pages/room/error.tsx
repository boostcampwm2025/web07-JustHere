import { useNavigate, useParams } from 'react-router-dom'
import { ERROR_TYPE, type ErrorType } from '@/app/error-boundary'
import { AlertCircleIcon } from '@/shared/assets'
import { Button, Header } from '@/shared/components'

interface ErrorPageProps {
  errorType: ErrorType
  onReset: () => void
  errorMessage: string
}

export default function RoomErrorPage({ errorType, onReset, errorMessage }: ErrorPageProps) {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const errorDescription: Record<ErrorType, string> = {
    [ERROR_TYPE.ROOM_NOT_FOUND]: '존재하지 않거나 삭제된 방입니다.',
    [ERROR_TYPE.RESULT_NOT_FOUND]: '투표를 먼저 진행해주세요.',
    [ERROR_TYPE.RESULT_LOAD_FAILED]: '잠시 후 다시 시도해주세요.',
    [ERROR_TYPE.UNKNOWN]: '잠시 후 다시 시도해주세요.',
  }

  const handleCreateRoom = () => navigate('/onboarding')
  const handleReset = () => onReset()
  const handleGoBack = () => {
    onReset()
    if (slug) {
      navigate(`/room/${slug}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-bg px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="size-24 mb-6 rounded-full bg-primary-bg flex items-center justify-center">
            <AlertCircleIcon className="size-24 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">{errorMessage}</h1>
          <h3 className="text-gray text-lg mb-8">{errorDescription[errorType]}</h3>

          {errorType === ERROR_TYPE.ROOM_NOT_FOUND && (
            <Button onClick={handleCreateRoom} size="lg">
              새 방 만들기
            </Button>
          )}
          {errorType === ERROR_TYPE.RESULT_NOT_FOUND && (
            <Button onClick={handleGoBack} size="lg">
              방으로 이동하기
            </Button>
          )}
          {(errorType === ERROR_TYPE.UNKNOWN || errorType === ERROR_TYPE.RESULT_LOAD_FAILED) && (
            <Button onClick={handleReset} size="lg">
              새로고침
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
