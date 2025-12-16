// hooks/useTransitRoute.ts
import { useState, useRef } from 'react';
import fetchData from '@/utils/fetchData';
import type {
  OdsayTransitResponse,
  OdsayTransitPath,
  OdsaySubPath,
} from '@web07/types';

// 지하철 노선별 색상
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

// 버스 타입별 색상
const BUS_COLORS: Record<number, string> = {
  1: '#0068B7',   // 일반 (파랑)
  11: '#0068B7',  // 일반
  12: '#53B332',  // 지선 (초록)
  13: '#FFC600',  // 순환
  14: '#E60012',  // 광역 (빨강)
  15: '#E60012',  // 급행
};

export const useTransitRoute = (
  mapRef: React.RefObject<kakao.maps.Map | null>
) => {
  const [isSearching, setIsSearching] = useState(false);
  const [routes, setRoutes] = useState<OdsayTransitPath[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const polylinesRef = useRef<kakao.maps.Polyline[]>([]);
  const markersRef = useRef<kakao.maps.Marker[]>([]);

  // 기존 경로 지우기
  const clearRoute = () => {
    polylinesRef.current.forEach(line => line.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  // 경로 색상 결정
  const getPathColor = (subPath: OdsaySubPath): string => {
    if (subPath.trafficType === 3) return '#888888'; // 도보: 회색
    
    if (subPath.trafficType === 1 && subPath.lane?.[0]?.subwayCode) {
      return SUBWAY_COLORS[subPath.lane[0].subwayCode] || '#000000';
    }
    
    if (subPath.trafficType === 2 && subPath.lane?.[0]?.type) {
      return BUS_COLORS[subPath.lane[0].type] || '#0068B7';
    }
    
    return '#000000';
  };

  // 경로 그리기
  const drawRoute = (path: OdsayTransitPath) => {
    if (!mapRef.current) return;
    
    const { kakao } = window;
    clearRoute();

    const bounds = new kakao.maps.LatLngBounds();

    path.subPath.forEach((subPath) => {
      const color = getPathColor(subPath);

      // 정류장 좌표가 있는 경우 (대중교통)
      if (subPath.passStopList?.stations?.length) {
        const linePath = subPath.passStopList.stations.map((station) => {
          const position = new kakao.maps.LatLng(
            parseFloat(station.y),
            parseFloat(station.x)
          );
          bounds.extend(position);
          return position;
        });

        // 폴리라인 생성
        const polyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeStyle: 'solid',
        });
        polyline.setMap(mapRef.current);
        polylinesRef.current.push(polyline);

        // 시작/끝 정류장 마커
        const firstStation = subPath.passStopList.stations[0];
        const lastStation = subPath.passStopList.stations[subPath.passStopList.stations.length - 1];

        [firstStation, lastStation].forEach((station) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(
              parseFloat(station.y),
              parseFloat(station.x)
            ),
            map: mapRef.current!,
          });

          const infoWindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;">${station.stationName}</div>`,
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(mapRef.current!, marker);
          });

          markersRef.current.push(marker);
        });
      } 
      // 도보 구간 (시작/끝 좌표만 있는 경우)
      else if (subPath.startX && subPath.startY && subPath.endX && subPath.endY) {
        const startPos = new kakao.maps.LatLng(subPath.startY, subPath.startX);
        const endPos = new kakao.maps.LatLng(subPath.endY, subPath.endX);

        bounds.extend(startPos);
        bounds.extend(endPos);

        const polyline = new kakao.maps.Polyline({
          path: [startPos, endPos],
          strokeWeight: 4,
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeStyle: 'dashed', // 도보는 점선
        });
        polyline.setMap(mapRef.current);
        polylinesRef.current.push(polyline);
      }
    });

    mapRef.current.setBounds(bounds);
  };

  // 경로 검색
  const searchTransitRoute = async (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    setIsSearching(true);

    try {
      const data = await fetchData<OdsayTransitResponse>(
        'http://localhost:3000/api/odsay/transit-route',
        { SX: startX, SY: startY, EX: endX, EY: endY }
      );

      if (data.result?.path?.length) {
        setRoutes(data.result.path);
        setSelectedRouteIndex(0);
        drawRoute(data.result.path[0]); // 첫 번째 경로 그리기
      } else {
        alert('경로를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('경로 검색 오류:', error);
      alert('경로 검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 다른 경로 선택
  const selectRoute = (index: number) => {
    if (routes[index]) {
      setSelectedRouteIndex(index);
      drawRoute(routes[index]);
    }
  };

  return {
    searchTransitRoute,
    isSearching,
    routes,
    selectedRouteIndex,
    selectRoute,
    clearRoute,
  };
};
