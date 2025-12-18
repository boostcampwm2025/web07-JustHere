import { useState, useRef } from "react";
import type { UserLocation } from "@web07/types";

export const useUserMarkers = (
  mapRef: React.RefObject<kakao.maps.Map | null>
) => {
  const [users, setUsers] = useState<UserLocation[]>([]);
  const markersRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const customOverlaysRef = useRef<Map<string, kakao.maps.CustomOverlay>>(
    new Map()
  );

  // 사용자 추가 및 마커 생성
  const addUser = (
    name: string,
    address: string,
    x: number,
    y: number,
    transportationType: "car" | "public_transit" = "public_transit"
  ) => {
    if (!mapRef.current) return;

    const { kakao } = window;
    const id = `user-${Date.now()}`;

    const newUser: UserLocation = {
      id,
      name,
      address,
      x,
      y,
      transportationType,
    };

    // 마커 생성
    const markerPosition = new kakao.maps.LatLng(y, x);
    const marker = new kakao.maps.Marker({
      position: markerPosition,
      map: mapRef.current,
    });

    // 커스텀 오버레이 생성 (사용자 이름 표시)
    const overlayContent = `
      <div style="
        padding: 5px 10px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        font-size: 12px;
        font-weight: bold;
        color: #1e40af;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        white-space: nowrap;
      ">
        ${name}
      </div>
    `;

    const customOverlay = new kakao.maps.CustomOverlay({
      position: markerPosition,
      content: overlayContent,
      yAnchor: 2.2, // 마커 위에 표시
    });
    customOverlay.setMap(mapRef.current);

    // 저장
    markersRef.current.set(id, marker);
    customOverlaysRef.current.set(id, customOverlay);
    setUsers((prev) => [...prev, newUser]);

    // 지도 중심을 추가된 마커로 이동
    mapRef.current.setCenter(markerPosition);

    return id;
  };

  // 사용자 제거
  const removeUser = (id: string) => {
    const marker = markersRef.current.get(id);
    const overlay = customOverlaysRef.current.get(id);

    if (marker) {
      marker.setMap(null);
      markersRef.current.delete(id);
    }

    if (overlay) {
      overlay.setMap(null);
      customOverlaysRef.current.delete(id);
    }

    setUsers((prev) => prev.filter((user) => user.id !== id));
  };

  // 모든 사용자 마커 제거
  const clearAllUsers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    customOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    markersRef.current.clear();
    customOverlaysRef.current.clear();
    setUsers([]);
  };

  return {
    users,
    addUser,
    removeUser,
    clearAllUsers,
  };
};
