import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map } from "@/components/Map";

import { ParticipantForm } from "@/components/ParticipantForm";

interface LocalParticipant {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
}

export function MainPage() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);

  const handleRoomCreated = (newRoomId: number) => {
    navigate(`/rooms/${newRoomId}`);
  };

  const handleParticipantsChange = (participants: LocalParticipant[]) => {
    setParticipants(participants);
  };

  return (
    <div className="flex justify-center items-end w-screen h-screen overflow-hidden">
      <Map participants={participants} />
      <div className="z-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-6 w-full max-w-md mb-4">
        <ParticipantForm
          onRoomCreated={handleRoomCreated}
          onParticipantsChange={handleParticipantsChange}
        />
      </div>
    </div>
  );
}
