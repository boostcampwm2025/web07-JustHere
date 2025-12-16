import { useRef, useCallback } from 'react';
import type {
  OdsayTransitResponse,
  UserLocation,
  OdsayLoadLaneResponse,
} from '@web07/types';
import type { MiddleLocationResult } from '@web07/types';
import fetchData from '@/utils/fetchData';

// 두 번째 코드에서 가져온 색상 정의
const SUBWAY_COLORS: Record<number, string> = {
  1: '#0052A4',   // 1호선
  2: '#00A84D',   // 2호선
  3: '#EF7C1C',   // 3호선
  4: '#00A5DE',   // 4호선
  5: '#996CAC',   // 5호선
  6: '#CD7C2F',   // 6호선
  7: '#747F00',   // 7호선
  8: '#E6186C',   // 8호선
  9: '#BDB092',   // 9호선
};

const BUS_COLORS: Record<number, string> = {
  1: '#0068B7',   // 일반 (파랑)
  11: '#0068B7',  // 일반
  12: '#53B332',  // 지선 (초록)
  13: '#FFC600',  // 순환
  14: '#E60012',  // 광역 (빨강)
  15: '#E60012',  // 급행
};

export const useMiddleMap = (mapRef: React.RefObject<kakao.maps.Map | null>) => {
  const userMarkersRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const userOverlaysRef = useRef<Map<string, kakao.maps.CustomOverlay>>(new Map());
  const stationMarkersRef = useRef<Map<number, kakao.maps.Marker>>(new Map());
  const stationOverlaysRef = useRef<Map<number, kakao.maps.CustomOverlay>>(new Map());
  const polylinesRef = useRef<kakao.maps.Polyline[]>([]);

  // 사용자 마커 표시
  const displayUserMarkers = useCallback((users: UserLocation[]) => {
    if (!mapRef.current || !window.kakao) return;

    const kakao = window.kakao;

    // 기존 마커 제거
    userMarkersRef.current.forEach(marker => marker.setMap(null));
    userOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    userMarkersRef.current.clear();
    userOverlaysRef.current.clear();

    // 새 마커 추가
    users.forEach(user => {
      const markerPosition = new kakao.maps.LatLng(user.y, user.x);

      const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: mapRef.current,
      });

      // 사용자 이름 오버레이
      const overlayContent = `
        <div style="padding: 5px 10px; background: white; border: 2px solid #3b82f6;
                     border-radius: 8px; font-size: 12px; font-weight: bold;
                     color: #1e40af; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ${user.name}
        </div>
      `;

      const customOverlay = new kakao.maps.CustomOverlay({
        position: markerPosition,
        content: overlayContent,
        yAnchor: 2.2,
      });
      customOverlay.setMap(mapRef.current);

      userMarkersRef.current.set(user.id, marker);
      userOverlaysRef.current.set(user.id, customOverlay);
    });

    // 지도 범위 조정 - 모든 사용자 마커가 보이도록
    if (users.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      users.forEach(user => {
        bounds.extend(new kakao.maps.LatLng(user.y, user.x));
      });
      mapRef.current.setBounds(bounds);
    }
  }, [mapRef]);

  // 중간 역 마커 표시 (여러 개)
  const displayStationMarkers = useCallback((results: MiddleLocationResult[], selectedStationIndex: number | null) => {
    if (!mapRef.current || !window.kakao) return;

    const kakao = window.kakao;

    // 기존 역 마커 제거
    stationMarkersRef.current.forEach(marker => marker.setMap(null));
    stationOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    stationMarkersRef.current.clear();
    stationOverlaysRef.current.clear();

    // 새 역 마커 추가
    results.forEach((result, index) => {
      const station = result.station;
      const markerPosition = new kakao.maps.LatLng(station.y, station.x);
      
      const isSelected = index === selectedStationIndex;
      const imageSize = new kakao.maps.Size(24, 35); 
      const markerImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", imageSize); 

      // 마커 이미지 (순위에 따라 다름)
      const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: mapRef.current,
        image : markerImage,
      });

      // 오버레이 내용: 선택된 경우만 역 이름 표시, 선택되지 않은 경우 순위만 표시
      const overlayContent = isSelected ? 
        // 선택된 역 (보라색 배경, 이름 포함)
        `<div style="padding: 6px 12px; background: #9333ea; border-radius: 8px;
                     font-size: 13px; font-weight: bold; color: white;
                     box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${index + 1}. ${station.name}
        </div>` :
        // 선택되지 않은 역 (회색 배경, 순위만)
        `<div>
          
        </div>`;


      const customOverlay = new kakao.maps.CustomOverlay({
        position: markerPosition,
        content: overlayContent,
        yAnchor: 2.5,
      });
      customOverlay.setMap(mapRef.current);

      stationMarkersRef.current.set(index, marker);
      stationOverlaysRef.current.set(index, customOverlay);
    });
  }, [mapRef]);

  // 단일 사용자-역 경로 폴리라인 그리기 로직 (두 번째 코드의 drawDetailedRoute 로직을 통합)
  const drawSingleUserRoute = useCallback(async (user: UserLocation, station: { x: number; y: number }) => {
    if (!mapRef.current || !window.kakao) return;
    const kakao = window.kakao;

    try {
      // ODsay API로 경로 조회
      const routeData = await fetchData<OdsayTransitResponse>(
        'http://localhost:3000/api/odsay/transit-route',
        { SX: user.x, SY: user.y, EX: station.x, EY: station.y }
      );

      if (!routeData.result?.path?.length) return;

      const path = routeData.result.path[0]; // 최적 경로 1개 사용
      const mapObject = `0:0@${path.info.mapObj}`;

      // loadLane API로 상세 경로 가져오기
      const laneData = await fetchData<OdsayLoadLaneResponse>(
        'http://localhost:3000/api/odsay/load-lane',
        { mapObject }
      );

      if (laneData?.result?.lane?.length) {
        const transitSubPaths = path.subPath.filter(sp => sp.trafficType !== 3);

        // 상세 경로 (대중교통) 그리기
        laneData.result.lane.forEach((laneDetail) => {
          let color = '#000000'; // 기본색

          // 해당하는 subPath를 찾아서 색상 결정
          const matchingSubPath = transitSubPaths.find(sp => {
            if (laneDetail.class === 1) return sp.trafficType === 2; // 버스
            if (laneDetail.class === 2) return sp.trafficType === 1; // 지하철
            return false;
          });

          if (matchingSubPath) {
            if (laneDetail.class === 1) { // 버스
              color = BUS_COLORS[laneDetail.type] || BUS_COLORS[matchingSubPath.lane?.[0]?.type || 1] || '#0068B7';
            } else if (laneDetail.class === 2) { // 지하철
              color = SUBWAY_COLORS[laneDetail.type] || SUBWAY_COLORS[matchingSubPath.lane?.[0]?.subwayCode || 1] || '#000000';
            }
          }

          // section별로 폴리라인 그리기
          laneDetail.section?.forEach((section) => {
            if (section.graphPos?.length) {
              const linePath = section.graphPos.map((pos: any) =>
                new kakao.maps.LatLng(pos.y, pos.x)
              );

              const polyline = new kakao.maps.Polyline({
                path: linePath,
                strokeWeight: 5,
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeStyle: 'solid',
              });

              polyline.setMap(mapRef.current);
              polylinesRef.current.push(polyline);
            }
          });
        });

      } else {
        console.warn(`${user.name}의 상세 경로 (loadLane) 실패. 기본 경로로 폴백 처리.`);
        // loadLane 실패 시, 두 번째 코드의 drawRouteFallback 로직을 따름
        path.subPath.forEach((subPath) => {
          const color = subPath.trafficType === 3 ? '#888888' : '#3b82f6'; // Fallback 색상

          if (subPath.passStopList?.stations?.length) { // 대중교통: 정류장/역 좌표 연결
            const linePath = subPath.passStopList.stations.map((station: any) =>
              new kakao.maps.LatLng(parseFloat(station.y), parseFloat(station.x))
            );

            const polyline = new kakao.maps.Polyline({
              path: linePath,
              strokeWeight: 5,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeStyle: 'solid',
            });
            polyline.setMap(mapRef.current);
            polylinesRef.current.push(polyline);
          }
        });
      }

      // 도보 구간 그리기 (loadLane 성공/실패와 별개로 subPath의 도보 정보를 사용)
      path.subPath.forEach((subPath) => {
        if (subPath.trafficType === 3 && subPath.startX && subPath.startY && subPath.endX && subPath.endY) {
          const startPos = new kakao.maps.LatLng(subPath.startY, subPath.startX);
          const endPos = new kakao.maps.LatLng(subPath.endY, subPath.endX);

          const polyline = new kakao.maps.Polyline({
            path: [startPos, endPos],
            strokeWeight: 4,
            strokeColor: '#888888', // 도보 색상 (회색)
            strokeOpacity: 0.6,
            strokeStyle: 'dashed', // 도보 스타일 (점선)
          });
          polyline.setMap(mapRef.current);
          polylinesRef.current.push(polyline);
        }
      });
    } catch (error) {
      console.error(`${user.name}의 경로를 그리는 중 오류:`, error);
    }
  }, [mapRef]);

  // 경로 폴리라인 그리기 (모든 사용자에 대해 drawSingleUserRoute 호출)
  const drawRoutePolylines = useCallback(async (users: UserLocation[], station: { x: number; y: number }) => {
    if (!mapRef.current || !window.kakao) return;

    // 기존 폴리라인 제거
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    // 각 사용자에서 역까지 경로 그리기
    const routePromises = users.map(user => drawSingleUserRoute(user, station));
    await Promise.all(routePromises);

    // 경로를 다 그린 후 지도 범위 조정 (선택 사항 - 여기서는 기존 로직대로 지도 조정은 생략)
  }, [mapRef, drawSingleUserRoute]);

  // 폴리라인 제거
  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
  }, []);

  // 모든 마커 제거
  const clearAllMarkers = useCallback(() => {
    userMarkersRef.current.forEach(marker => marker.setMap(null));
    userOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    stationMarkersRef.current.forEach(marker => marker.setMap(null));
    stationOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    polylinesRef.current.forEach(polyline => polyline.setMap(null));

    userMarkersRef.current.clear();
    userOverlaysRef.current.clear();
    stationMarkersRef.current.clear();
    stationOverlaysRef.current.clear();
    polylinesRef.current = [];
  }, []);

  return {
    displayUserMarkers,
    displayStationMarkers,
    drawRoutePolylines,
    clearPolylines,
    clearAllMarkers,
  };
};
