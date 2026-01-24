import { Navigate, Route, Routes } from 'react-router-dom'
import { RoomErrorBoundary } from './components/error-boundary/RoomErrorBoundary'
import { OnboardingPage } from './pages/Onboarding/page'
import { RoomPage } from './pages/Room/page'

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
