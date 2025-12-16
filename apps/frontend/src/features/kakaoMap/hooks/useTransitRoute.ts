// hooks/useTransitRoute.ts
import { useState, useRef } from 'react';
import fetchData from '@/utils/fetchData';
import type {
  OdsayTransitResponse,
  OdsayTransitPath,
  OdsaySubPath,
  OdsayLoadLaneResponse,
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


  // 상세 경로 좌표로 폴리라인 그리기
  const drawDetailedRoute = async (path: OdsayTransitPath) => {
    if (!mapRef.current) return;

    const { kakao } = window;
    clearRoute();

    const bounds = new kakao.maps.LatLngBounds();

    // info.mapObj를 사용하여 전체 경로의 상세 좌표 가져오기
    if (path.info.mapObj) {

      const mapObject = `0:0@${path.info.mapObj}`;
      const laneData = await fetchData<OdsayLoadLaneResponse>(
        'http://localhost:3000/api/odsay/load-lane',
        { mapObject }
      );

      if (laneData?.result?.lane?.length) {
        // 대중교통 subPath들만 필터링
        const transitSubPaths = path.subPath.filter(sp => sp.trafficType !== 3);

        // 각 lane을 순회하며 폴리라인 그리기
        laneData.result.lane.forEach((laneDetail) => {
          // laneDetail.class로 해당하는 subPath 찾기
          // class 1: 버스 (trafficType 2), class 2: 지하철 (trafficType 1)
          const matchingSubPath = transitSubPaths.find(sp => {
            if (laneDetail.class === 1) return sp.trafficType === 2; // 버스
            if (laneDetail.class === 2) return sp.trafficType === 1; // 지하철
            return false;
          });

          // laneDetail.type으로 더 정확한 색상 결정
          let color = '#000000';
          if (matchingSubPath) {
            if (laneDetail.class === 1) {
              // 버스: type으로 색상 결정
              color = BUS_COLORS[laneDetail.type] || BUS_COLORS[matchingSubPath.lane?.[0]?.type || 1] || '#0068B7';
            } else if (laneDetail.class === 2) {
              // 지하철: type(노선번호)으로 색상 결정
              color = SUBWAY_COLORS[laneDetail.type] || '#000000';
            }
          }


          // section별로 폴리라인 그리기
          laneDetail.section?.forEach((section) => {
            if (section.graphPos?.length) {

              const linePath = section.graphPos.map((pos) => {
                const position = new kakao.maps.LatLng(pos.y, pos.x);
                bounds.extend(position);
                return position;
              });

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

        // 시작/끝 정류장 마커 추가
        path.subPath.forEach((subPath) => {
          if (subPath.trafficType !== 3 && subPath.passStopList?.stations?.length) {
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
        });

        // 도보 구간 그리기
        path.subPath.forEach((subPath) => {
          if (subPath.trafficType === 3 && subPath.startX && subPath.startY && subPath.endX && subPath.endY) {
            const startPos = new kakao.maps.LatLng(subPath.startY, subPath.startX);
            const endPos = new kakao.maps.LatLng(subPath.endY, subPath.endX);

            bounds.extend(startPos);
            bounds.extend(endPos);

            const polyline = new kakao.maps.Polyline({
              path: [startPos, endPos],
              strokeWeight: 4,
              strokeColor: '#888888',
              strokeOpacity: 0.6,
              strokeStyle: 'dashed',
            });
            polyline.setMap(mapRef.current);
            polylinesRef.current.push(polyline);
          }
        });
      } else {
        console.warn('⚠️ loadLane 실패, 기본 경로로 폴백');
        drawRouteFallback(path, bounds);
      }
    } else {
      console.warn('⚠️ mapObj 없음, 기본 경로로 폴백');
      drawRouteFallback(path, bounds);
    }

    mapRef.current.setBounds(bounds);
  };

  // 폴백: 정류장 좌표로 그리기
  const drawRouteFallback = (path: OdsayTransitPath, bounds: kakao.maps.LatLngBounds) => {
    const { kakao } = window;

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
      // 도보 구간
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
          strokeStyle: 'dashed',
        });
        polyline.setMap(mapRef.current);
        polylinesRef.current.push(polyline);
      }
    });
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
        await drawDetailedRoute(data.result.path[0]); // 상세 경로 그리기
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
  const selectRoute = async (index: number) => {
    if (routes[index]) {
      setSelectedRouteIndex(index);
      await drawDetailedRoute(routes[index]); // 상세 경로 그리기
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
