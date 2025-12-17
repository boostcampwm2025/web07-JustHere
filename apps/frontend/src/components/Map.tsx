import { useState, useEffect, useRef, useCallback } from "react";
import {
  Map as KakaoMap,
  MapMarker,
  CustomOverlayMap,
  Polyline,
} from "react-kakao-maps-sdk";

interface Participant {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
}

interface ParticipantDuration {
  participantId: number;
  participantName: string;
  duration: number;
  path?: Array<{ lat: number; lng: number }>;
}

interface MidpointCandidate {
  id: number;
  name: string;
  lat: number;
  lng: number;
  subwayLines: string[];
  averageDuration: number;
  timeDifference: number;
  score: number;
  participantDurations?: ParticipantDuration[];
}

interface MapProps {
  participants: Participant[];
  candidates?: MidpointCandidate[];
  selectedCandidateId?: number | null;
  onCandidateClick?: (candidateId: number) => void;
}

const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

export function Map({
  participants,
  candidates = [],
  selectedCandidateId = null,
  onCandidateClick,
}: MapProps) {
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

  const setBoundsToAll = useCallback(() => {
    if (
      !mapRef.current ||
      (participants.length === 0 && candidates.length === 0)
    ) {
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    participants.forEach((participant) => {
      bounds.extend(new kakao.maps.LatLng(participant.lat, participant.lng));
    });
    candidates.forEach((candidate) => {
      bounds.extend(new kakao.maps.LatLng(candidate.lat, candidate.lng));
    });

    mapRef.current.setBounds(bounds);
    boundsSetRef.current = true;
  }, [participants, candidates]);

  useEffect(() => {
    if (
      !mapRef.current ||
      (participants.length === 0 && candidates.length === 0) ||
      !boundsSetRef.current
    ) {
      return;
    }

    // 지도가 이미 준비된 상태에서 participants나 candidates가 변경되면 bounds 업데이트
    setBoundsToAll();
  }, [participants, candidates, setBoundsToAll]);

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
          if (
            (participants.length > 0 || candidates.length > 0) &&
            !boundsSetRef.current
          ) {
            setBoundsToAll();
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
      {candidates.map((candidate, index) => (
        <div key={candidate.id}>
          <MapMarker
            position={{ lat: candidate.lat, lng: candidate.lng }}
            image={{
              src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerGreen.png",
              size: { width: 24, height: 35 },
              options: {
                offset: { x: 12, y: 35 },
              },
            }}
            onClick={() => {
              onCandidateClick?.(candidate.id);
            }}
          />
          <CustomOverlayMap
            position={{ lat: candidate.lat, lng: candidate.lng }}
            yAnchor={2.2}
          >
            <div
              className={`px-2 py-1 rounded text-xs font-semibold shadow-lg ${
                selectedCandidateId === candidate.id
                  ? "bg-green-600 text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              #{index + 1} 추천
            </div>
          </CustomOverlayMap>
        </div>
      ))}

      {/* 폴리라인: 선택된 후보에 대해서만 표시 */}
      {selectedCandidateId !== null &&
        candidates
          .filter((c) => c.id === selectedCandidateId)
          .map((selectedCandidate) => {
            const colors = [
              "#FF6B6B",
              "#4ECDC4",
              "#45B7D1",
              "#FFA07A",
              "#98D8C8",
              "#F7DC6F",
              "#BB8FCE",
            ];

            return participants.map((participant, idx) => {
              // 참여자별 경로 정보 찾기
              const participantDuration =
                selectedCandidate.participantDurations?.find(
                  (pd) => pd.participantId === participant.id
                );

              // 경로 정보가 있으면 사용, 없으면 직선 경로 사용
              let path: Array<{ lat: number; lng: number }>;
              if (
                participantDuration?.path &&
                Array.isArray(participantDuration.path) &&
                participantDuration.path.length > 0
              ) {
                // 경로 좌표가 유효한지 확인 (lat, lng이 모두 숫자인지)
                const validPath = participantDuration.path.filter(
                  (p) =>
                    typeof p.lat === "number" &&
                    typeof p.lng === "number" &&
                    !isNaN(p.lat) &&
                    !isNaN(p.lng)
                );
                if (validPath.length > 0) {
                  path = validPath;
                } else {
                  // 유효한 좌표가 없으면 직선 경로 사용
                  path = [
                    { lat: participant.lat, lng: participant.lng },
                    {
                      lat: selectedCandidate.lat,
                      lng: selectedCandidate.lng,
                    },
                  ];
                }
              } else {
                // 경로 정보가 없으면 직선 경로 사용
                path = [
                  { lat: participant.lat, lng: participant.lng },
                  {
                    lat: selectedCandidate.lat,
                    lng: selectedCandidate.lng,
                  },
                ];
              }

              const isCar = participant.transportMode === "CAR";
              const baseColor = colors[idx % colors.length];

              // 자동차인 경우 더 진한 색상 적용
              const strokeColor = isCar
                ? baseColor
                : colors[idx % colors.length];
              const strokeWeight = isCar ? 5 : 3;
              const strokeOpacity = isCar ? 1.0 : 0.7;

              return (
                <Polyline
                  key={`polyline-${participant.id}-${selectedCandidate.id}`}
                  path={path}
                  strokeWeight={strokeWeight}
                  strokeColor={strokeColor}
                  strokeOpacity={strokeOpacity}
                  strokeStyle="solid"
                />
              );
            });
          })}
    </KakaoMap>
  );
}
