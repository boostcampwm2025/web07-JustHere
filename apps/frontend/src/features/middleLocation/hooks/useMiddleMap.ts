import { useRef, useCallback } from "react";
import type {
  OdsayTransitResponse,
  UserLocation,
  OdsayLoadLaneResponse,
  KakaoDirectionResponse,
  OdsayStation,
  OdsayGraphPos,
  UserDetailedRoute,
} from "@web07/types";
import type { MiddleLocationResult } from "@web07/types";
import fetchData from "@/utils/fetchData";

const USER_COLORS = [
  "#E74C3C", // 빨강
  "#1ABC9C", // 청록
  "#3498DB", // 파랑
  "#E67E22", // 주황
  "#2ECC71", // 초록
  "#F1C40F", // 노랑
  "#9B59B6", // 보라
  "#16A085", // 진한 청록
  "#D35400", // 진한 주황
  "#27AE60", // 진한 초록
];

export const useMiddleMap = (
  mapRef: React.RefObject<kakao.maps.Map | null>
) => {
  const userMarkersRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const userOverlaysRef = useRef<Map<string, kakao.maps.CustomOverlay>>(
    new Map()
  );
  const stationMarkersRef = useRef<Map<number, kakao.maps.Marker>>(new Map());
  const stationOverlaysRef = useRef<Map<number, kakao.maps.CustomOverlay>>(
    new Map()
  );
  const polylinesRef = useRef<kakao.maps.Polyline[]>([]);

  // 사용자 마커 표시
  const displayUserMarkers = useCallback(
    (users: UserLocation[]) => {
      if (!mapRef.current || !window.kakao) return;

      const kakao = window.kakao;

      // 기존 마커 제거
      userMarkersRef.current.forEach((marker) => marker.setMap(null));
      userOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      userMarkersRef.current.clear();
      userOverlaysRef.current.clear();

      // 새 마커 추가
      users.forEach((user) => {
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
        users.forEach((user) => {
          bounds.extend(new kakao.maps.LatLng(user.y, user.x));
        });
        mapRef.current.setBounds(bounds);
      }
    },
    [mapRef]
  );

  // 중간 역 마커 표시 (여러 개)
  const displayStationMarkers = useCallback(
    (results: MiddleLocationResult[], selectedStationIndex: number | null) => {
      if (!mapRef.current || !window.kakao) return;

      const kakao = window.kakao;

      // 기존 역 마커 제거
      stationMarkersRef.current.forEach((marker) => marker.setMap(null));
      stationOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      stationMarkersRef.current.clear();
      stationOverlaysRef.current.clear();

      // 새 역 마커 추가
      results.forEach((result, index) => {
        const station = result.station;
        const markerPosition = new kakao.maps.LatLng(station.y, station.x);

        const isSelected = index === selectedStationIndex;
        const imageSize = new kakao.maps.Size(24, 35);
        const markerImage = new kakao.maps.MarkerImage(
          "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
          imageSize
        );

        // 마커 이미지 (순위에 따라 다름)
        const marker = new kakao.maps.Marker({
          position: markerPosition,
          map: mapRef.current,
          image: markerImage,
        });

        // 오버레이 내용: 선택된 경우만 역 이름 표시, 선택되지 않은 경우 순위만 표시
        const overlayContent = isSelected
          ? // 선택된 역 (보라색 배경, 이름 포함)
            `<div style="padding: 6px 12px; background: #9333ea; border-radius: 8px;
                     font-size: 13px; font-weight: bold; color: white;
                     box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${index + 1}. ${station.name}
        </div>`
          : // 선택되지 않은 역 (회색 배경, 순위만)
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
    },
    [mapRef]
  );

  // 단일 사용자-역 경로 폴리라인 그리기 로직 (두 번째 코드의 drawDetailedRoute 로직을 통합)
  const drawSingleUserRoute = useCallback(
    async (
      user: UserLocation,
      station: { x: number; y: number },
      userColor: string
    ): Promise<UserDetailedRoute | null> => {
      if (!mapRef.current || !window.kakao) return null;
      const kakao = window.kakao;

      try {
        // 자동차일 때는 카카오 direction API 사용
        if (user.transportationType === "car") {
          const directionData = await fetchData<KakaoDirectionResponse>(
            "http://localhost:3000/api/kakao/directions",
            {
              originX: user.x,
              originY: user.y,
              destinationX: station.x,
              destinationY: station.y,
            }
          );

          if (!directionData.routes?.length) return null;

          const route = directionData.routes[0];
          const totalTime = Math.round(route.summary.duration / 60); // 초를 분으로 변환

          // 각 section의 roads에서 경로 좌표 추출
          route.sections.forEach((section) => {
            section.roads.forEach((road) => {
              if (road.vertexes && road.vertexes.length >= 2) {
                // vertexes는 [x1, y1, x2, y2, ...] 형태
                const linePath: kakao.maps.LatLng[] = [];
                for (let i = 0; i < road.vertexes.length; i += 2) {
                  if (i + 1 < road.vertexes.length) {
                    linePath.push(
                      new kakao.maps.LatLng(
                        road.vertexes[i + 1],
                        road.vertexes[i]
                      )
                    );
                  }
                }

                if (linePath.length > 0) {
                  const polyline = new kakao.maps.Polyline({
                    path: linePath,
                    strokeWeight: 6,
                    strokeColor: userColor, // 사용자별 색상 적용
                    strokeOpacity: 0.8,
                    strokeStyle: "solid",
                  });
                  polyline.setMap(mapRef.current);
                  polylinesRef.current.push(polyline);
                }
              }
            });
          });

          // 자동차의 경우 상세 경로 정보 없음
          return {
            userName: user.name,
            segments: [],
            totalTime,
            transferCount: 0,
          };
        }

        // 대중교통일 때는 ODsay API로 경로 조회
        const routeData = await fetchData<OdsayTransitResponse>(
          "http://localhost:3000/api/odsay/transit-route",
          { SX: user.x, SY: user.y, EX: station.x, EY: station.y }
        );

        if (!routeData.result?.path?.length) return null;

        const path = routeData.result.path[0]; // 최적 경로 1개 사용

        // 상세 경로 정보 추출
        const segments: UserDetailedRoute["segments"] = [];
        const transitSubPaths = path.subPath.filter(
          (sp) => sp.trafficType !== 3
        );
        const transferCount = Math.max(0, transitSubPaths.length - 1);

        path.subPath.forEach((subPath) => {
          // 버스인 경우 버스 번호 사용, 지하철인 경우 노선명 사용, 도보인 경우 "도보" 사용
          let laneName: string;
          if (subPath.trafficType === 3) {
            // 도보
            laneName = "도보";
          } else if (subPath.trafficType === 2) {
            // 버스
            laneName = subPath.lane?.[0]?.busNo
              ? `${subPath.lane[0].busNo}번 버스`
              : subPath.lane?.[0]?.name || "버스";
          } else {
            // 지하철 (trafficType === 1)
            laneName = subPath.lane?.[0]?.name || "지하철";
          }

          const startName = subPath.startName || "";
          const endName = subPath.endName || "";
          const sectionTime = Math.round(subPath.sectionTime); // 이미 분 단위

          segments.push({
            laneName,
            startName,
            endName,
            sectionTime,
            trafficType: subPath.trafficType,
          });
        });

        const detailedRoute: UserDetailedRoute = {
          userName: user.name,
          segments,
          totalTime: Math.round(path.info.totalTime / 60), // 초를 분으로 변환
          transferCount,
        };

        const mapObject = `0:0@${path.info.mapObj}`;

        // loadLane API로 상세 경로 가져오기
        const laneData = await fetchData<OdsayLoadLaneResponse>(
          "http://localhost:3000/api/odsay/load-lane",
          { mapObject }
        );

        if (laneData?.result?.lane?.length) {
          laneData.result.lane.forEach((laneDetail) => {
            const color = userColor;

            // section별로 폴리라인 그리기
            laneDetail.section?.forEach((section) => {
              if (section.graphPos?.length) {
                const linePath = section.graphPos.map(
                  (pos: OdsayGraphPos) => new kakao.maps.LatLng(pos.y, pos.x)
                );

                const polyline = new kakao.maps.Polyline({
                  path: linePath,
                  strokeWeight: 5,
                  strokeColor: color,
                  strokeOpacity: 0.8,
                  strokeStyle: "solid",
                });

                polyline.setMap(mapRef.current);
                polylinesRef.current.push(polyline);
              }
            });
          });
        } else {
          // loadLane 실패 시, 사용자 색상 사용
          path.subPath.forEach((subPath) => {
            const color = subPath.trafficType === 3 ? "#888888" : userColor; // 도보는 회색, 나머지는 사용자 색상

            if (subPath.passStopList?.stations?.length) {
              // 대중교통: 정류장/역 좌표 연결
              const linePath = subPath.passStopList.stations.map(
                (station: OdsayStation) =>
                  new kakao.maps.LatLng(
                    parseFloat(station.y),
                    parseFloat(station.x)
                  )
              );

              const polyline = new kakao.maps.Polyline({
                path: linePath,
                strokeWeight: 5,
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeStyle: "solid",
              });
              polyline.setMap(mapRef.current);
              polylinesRef.current.push(polyline);
            }
          });
        }

        // 도보 구간 그리기 (loadLane 성공/실패와 별개로 subPath의 도보 정보를 사용)
        path.subPath.forEach((subPath, subPathIndex) => {
          if (subPath.trafficType === 3) {
            let startPos: kakao.maps.LatLng | null = null;
            let endPos: kakao.maps.LatLng | null = null;

            // startX/Y, endX/Y가 있으면 사용
            if (
              subPath.startX &&
              subPath.startY &&
              subPath.endX &&
              subPath.endY
            ) {
              startPos = new kakao.maps.LatLng(subPath.startY, subPath.startX);
              endPos = new kakao.maps.LatLng(subPath.endY, subPath.endX);
            }
            // startX/Y가 없으면 이전/다음 구간의 좌표 사용
            else {
              // 이전 구간에서 끝 좌표 가져오기
              if (subPathIndex > 0) {
                const prevSubPath = path.subPath[subPathIndex - 1];
                if (prevSubPath.passStopList?.stations?.length) {
                  const lastStation =
                    prevSubPath.passStopList.stations[
                      prevSubPath.passStopList.stations.length - 1
                    ];
                  startPos = new kakao.maps.LatLng(
                    parseFloat(lastStation.y),
                    parseFloat(lastStation.x)
                  );
                } else if (prevSubPath.endX && prevSubPath.endY) {
                  startPos = new kakao.maps.LatLng(
                    prevSubPath.endY,
                    prevSubPath.endX
                  );
                }
              } else {
                // 첫 번째 구간이 도보인 경우 사용자 위치 사용
                startPos = new kakao.maps.LatLng(user.y, user.x);
              }

              // 다음 구간에서 시작 좌표 가져오기
              if (subPathIndex < path.subPath.length - 1) {
                const nextSubPath = path.subPath[subPathIndex + 1];
                if (nextSubPath.passStopList?.stations?.length) {
                  const firstStation = nextSubPath.passStopList.stations[0];
                  endPos = new kakao.maps.LatLng(
                    parseFloat(firstStation.y),
                    parseFloat(firstStation.x)
                  );
                } else if (nextSubPath.startX && nextSubPath.startY) {
                  endPos = new kakao.maps.LatLng(
                    nextSubPath.startY,
                    nextSubPath.startX
                  );
                }
              } else {
                // 마지막 구간이 도보인 경우 역 위치 사용
                endPos = new kakao.maps.LatLng(station.y, station.x);
              }
            }

            // startPos와 endPos가 모두 있으면 폴리라인 그리기
            if (startPos && endPos) {
              const polyline = new kakao.maps.Polyline({
                path: [startPos, endPos],
                strokeWeight: 4,
                strokeColor: "#888888", // 도보 색상 (회색)
                strokeOpacity: 0.6,
                strokeStyle: "dashed", // 도보 스타일 (점선)
              });
              polyline.setMap(mapRef.current);
              polylinesRef.current.push(polyline);
            }
          }
        });

        return detailedRoute;
      } catch (error) {
        console.error(`${user.name}의 경로를 그리는 중 오류:`, error);
        return null;
      }
    },
    [mapRef]
  );

  // 경로 폴리라인 그리기 (모든 사용자에 대해 drawSingleUserRoute 호출)
  const drawRoutePolylines = useCallback(
    async (
      users: UserLocation[],
      station: { x: number; y: number }
    ): Promise<UserDetailedRoute[]> => {
      if (!mapRef.current || !window.kakao) return [];

      // 기존 폴리라인 제거
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      polylinesRef.current = [];

      // 각 사용자에서 역까지 경로 그리기 (사용자별 색상 할당)
      const routePromises = users.map((user, index) => {
        const userColor =
          USER_COLORS[index % USER_COLORS.length] || USER_COLORS[0];
        return drawSingleUserRoute(user, station, userColor);
      });
      const detailedRoutes = await Promise.all(routePromises);

      // null 값 필터링하고 반환
      return detailedRoutes.filter(
        (route): route is UserDetailedRoute => route !== null
      );
    },
    [mapRef, drawSingleUserRoute]
  );

  // 폴리라인 제거
  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];
  }, []);

  // 모든 마커 제거
  const clearAllMarkers = useCallback(() => {
    userMarkersRef.current.forEach((marker) => marker.setMap(null));
    userOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    stationMarkersRef.current.forEach((marker) => marker.setMap(null));
    stationOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));

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
