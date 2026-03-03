import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary, RoomErrorBoundary } from './error-boundary'
import { RoomSocketProvider } from '@/pages/room/contexts'

const LandingPage = lazy(() => import('@/pages/landing/page'))
const OnboardingPage = lazy(() => import('@/pages/onboarding/page'))
const RoomPage = lazy(() => import('@/pages/room/page'))
const ResultPage = lazy(() => import('@/pages/result/page').then(m => ({ default: m.ResultPage })))

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
)

export function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* 중첩 라우트: RoomLayout이 소켓 연결 관리 */}
          <Route
            element={
              <RoomErrorBoundary>
                <RoomSocketProvider>
                  <Outlet />
                </RoomSocketProvider>
              </RoomErrorBoundary>
            }
          >
            <Route path="/room/:slug" element={<RoomPage />} />
            <Route path="/result/:slug" element={<ResultPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  )
}

export default App
