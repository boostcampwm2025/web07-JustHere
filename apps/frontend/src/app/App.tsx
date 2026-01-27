import { Navigate, Route, Routes } from 'react-router-dom'
import { OnboardingPage, RoomPage } from '@/pages'
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
    </Routes>
  )
}

export default App
