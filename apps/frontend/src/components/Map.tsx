import { useState, useEffect, useRef, useCallback } from "react";
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
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const tilesLoadedHandlerRef = useRef<(() => void) | null>(null);
  const boundsSetRef = useRef(false);

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

  const setBoundsToParticipants = useCallback(() => {
    if (!mapRef.current || participants.length === 0) {
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    participants.forEach((participant) => {
      bounds.extend(new kakao.maps.LatLng(participant.lat, participant.lng));
    });

    mapRef.current.setBounds(bounds);
    boundsSetRef.current = true;
  }, [participants]);

  useEffect(() => {
    if (!mapRef.current || participants.length === 0 || !boundsSetRef.current) {
      return;
    }

    // 지도가 이미 준비된 상태에서 participants가 변경되면 bounds 업데이트
    setBoundsToParticipants();
  }, [participants, setBoundsToParticipants]);

  useEffect(() => {
    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      if (mapRef.current && tilesLoadedHandlerRef.current) {
        kakao.maps.event.removeListener(
          mapRef.current,
          "tilesloaded",
          tilesLoadedHandlerRef.current
        );
        tilesLoadedHandlerRef.current = null;
      }
    };
  }, []);

  return (
    <KakaoMap
      center={mapCenter}
      level={participants.length > 0 ? 5 : 5}
      className="absolute inset-0 w-full h-full"
      onCreate={(map) => {
        mapRef.current = map;
        boundsSetRef.current = false;

        const handler = () => {
          if (participants.length > 0 && !boundsSetRef.current) {
            setBoundsToParticipants();
          }
        };

        kakao.maps.event.addListener(map, "tilesloaded", handler);
        tilesLoadedHandlerRef.current = handler;
      }}
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
