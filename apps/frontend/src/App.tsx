import { Navigate, Route, Routes } from 'react-router-dom'
import { OnboardingPage } from './pages/Onboarding'
import { RoomErrorBoundary } from './components/error-boundary/RoomErrorBoundary'
import { RoomPage } from './pages/Room'

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
