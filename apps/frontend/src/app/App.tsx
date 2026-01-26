import { Navigate, Route, Routes } from 'react-router-dom'
import { OnboardingPage, ResultPage, RoomPage } from '@/pages'
import { RoomErrorBoundary } from './error-boundary'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/room/:slug"
        element={
          <RoomErrorBoundary>
            <RoomPage />
          </RoomErrorBoundary>
        }
      />
      <Route
        path="/result/:slug"
        element={
          <RoomErrorBoundary>
            <ResultPage />
          </RoomErrorBoundary>
        }
      />
    </Routes>
  )
}

export default App
