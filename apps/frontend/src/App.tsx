import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainPage } from "@/components/MainPage";
import { RoomDetailPage } from "@/components/RoomDetailPage";
import { MidpointCandidatesPage } from "@/components/MidpointCandidatesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
        <Route
          path="/rooms/:roomId/midpoints"
          element={<MidpointCandidatesPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
