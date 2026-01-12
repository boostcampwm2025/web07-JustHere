import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import OnboardingPage from "@/pages/OnboardingPage";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
