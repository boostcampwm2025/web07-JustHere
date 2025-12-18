import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LocationSetupPage from './pages/locationSetup.page';
import MiddleLocationPage from './pages/middleLocation.page';
import ResultPage from './pages/result.page';

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LocationSetupPage />} />
        <Route path='/middle' element={<MiddleLocationPage />} />
        <Route path='/result' element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
