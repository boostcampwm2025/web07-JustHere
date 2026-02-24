import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { RoomErrorBoundary } from './error-boundary'
import { RoomSocketProvider } from '@/pages/room/contexts'

const LandingPage = lazy(() => import('@/pages/landing/page'))
const OnboardingPage = lazy(() => import('@/pages/onboarding/page'))
const RoomPage = lazy(() => import('@/pages/room/page'))
const ResultPage = lazy(() => import('@/pages/result/page').then(m => ({ default: m.ResultPage })))

export function App() {
  return (
    <Suspense>
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
  )
}

export default App
