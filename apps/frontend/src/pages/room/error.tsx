import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircleIcon } from '@/shared/assets'
import { Button, Header } from '@/shared/components'

type ErrorType = 'room-not-found' | 'result-not-found' | 'unknown'
interface ErrorPageProps {
  errorType: ErrorType
  onReset: () => void
  errorMessage?: string
}

export default function RoomErrorPage({ errorType = 'unknown', onReset, errorMessage = '오류가 발생했습니다.' }: ErrorPageProps) {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const errorDescription: Record<ErrorType, string> = {
    'room-not-found': '존재하지 않거나 삭제된 방입니다.',
    'result-not-found': '투표를 먼저 진행해주세요.',
    unknown: '잠시 후 다시 시도해주세요.',
  }

  const handleCreateRoom = () => navigate('/onboarding')
  const handleReset = () => onReset()
  const handleGoBack = () => {
    onReset()
    if (slug) navigate(`/room/${slug}`, { replace: true })
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

          {errorType === 'room-not-found' && (
            <Button onClick={handleCreateRoom} size="lg">
              새 방 만들기
            </Button>
          )}
          {errorType === 'result-not-found' && (
            <Button onClick={handleGoBack} size="lg">
              방으로 이동하기
            </Button>
          )}
          {errorType === 'unknown' && (
            <Button onClick={handleReset} size="lg">
              새로고침
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
