import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import OnboardingPage from "@/pages/OnboardingPage";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/main" element={<MainPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
