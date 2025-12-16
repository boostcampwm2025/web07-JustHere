import { useState } from "react";
import {
  Map as KakaoMap,
  MapMarker,
  CustomOverlayMap,
} from "react-kakao-maps-sdk";

interface Participant {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
}

interface MapProps {
  participants: Participant[];
}

const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

export function Map({ participants }: MapProps) {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  const calculateCenter = () => {
    if (participants.length === 0) {
      return DEFAULT_CENTER;
    }

    const sumLat = participants.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = participants.reduce((sum, p) => sum + p.lng, 0);

    return {
      lat: sumLat / participants.length,
      lng: sumLng / participants.length,
    };
  };

  const mapCenter =
    participants.length > 0 ? calculateCenter() : DEFAULT_CENTER;

  return (
    <KakaoMap
      center={mapCenter}
      level={participants.length > 0 ? 5 : 5}
      className="absolute inset-0 w-full h-full"
    >
      {participants.map((participant) => (
        <div key={participant.id}>
          <MapMarker
            position={{ lat: participant.lat, lng: participant.lng }}
            onClick={() => {
              setSelectedMarker(
                selectedMarker === participant.id ? null : participant.id
              );
            }}
          />
          {selectedMarker === participant.id && (
            <CustomOverlayMap
              position={{ lat: participant.lat, lng: participant.lng }}
            >
              <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
                <p className="font-medium text-sm">{participant.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {participant.address}
                </p>
              </div>
            </CustomOverlayMap>
          )}
        </div>
      ))}
    </KakaoMap>
  );
}
