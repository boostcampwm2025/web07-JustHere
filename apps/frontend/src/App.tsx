import { Navigate, Route, Routes } from 'react-router-dom'
import OnboardingPage from '@/pages/OnboardingPage'
import MainPage from '@/pages/MainPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/main" element={<MainPage />} />
    </Routes>
  )
}

export default App
