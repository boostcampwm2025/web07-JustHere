import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { ParticipantInputPage } from './pages/ParticipantInputPage';
import { ResultPage } from './pages/ResultPage';
import { PlacesPage } from './pages/PlacesPage';

function App() {
  const isGoogleMapsLoaded = useGoogleMaps();

  if (!isGoogleMapsLoaded) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<ParticipantInputPage />} />
        <Route path='/result' element={<ResultPage />} />
        <Route path='/places' element={<PlacesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
