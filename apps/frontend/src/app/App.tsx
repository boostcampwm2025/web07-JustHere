import { Outlet, Route, Routes } from 'react-router-dom'
import { LandingPage, OnboardingPage, ResultPage, RoomPage } from '@/pages'
import { RoomErrorBoundary } from './error-boundary'
import { RoomSocketProvider } from '@/pages/room/contexts'

export function App() {
  return (
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
  )
}

export default App
