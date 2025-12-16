import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LocationSetupPage from './pages/locationSetup.page';
import MiddleLocationPage from './pages/middleLocation.page';

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LocationSetupPage />} />
        <Route path="/middle" element={<MiddleLocationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
