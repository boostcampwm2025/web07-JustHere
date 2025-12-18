import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInitailMap } from "@/features/kakaoMap/hooks/useInitailMap";
import { useMiddleLocation } from "@/features/middleLocation/hooks/useMiddleLocation";
import { useMiddleMap } from "@/features/middleLocation/hooks/useMiddleMap";
import type { UserLocation, UserDetailedRoute } from "@web07/types";
import { getLaneColor } from "@/features/middleLocation/utils/getLaneColor";
import { cn } from "@/utils/cn";

function MiddleLocationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMapLoaded, mapRef } = useInitailMap();
  const { results, isLoading, error, findMiddleLocations } = useMiddleLocation();
  const { displayUserMarkers, displayStationMarkers, drawRoutePolylines, clearPolylines } =
    useMiddleMap(mapRef);

  const [selectedStationIndex, setSelectedStationIndex] = useState<
    number | null
  >(null);
  const [isDrawingRoutes, setIsDrawingRoutes] = useState(false);
  const [detailedRoutes, setDetailedRoutes] = useState<
    Map<number, UserDetailedRoute[]>
  >(new Map());

  // 전달받은 사용자 데이터
  const users: UserLocation[] = location.state?.users || [];

  // 사용자 데이터가 없으면 이전 페이지로 이동
  useEffect(() => {
    if (users.length === 0) {
      alert("사용자 정보가 없습니다. 이전 페이지로 돌아갑니다.");
      navigate("/");
    }
  }, [users, navigate]);

  // 마커를 지도에 표시하는 함수를 useCallback으로 정의
  const updateStationMarkers = useCallback(
    (selectedIndex: number | null) => {
      if (results.length > 0) {
        // displayStationMarkers 호출 시 선택된 인덱스 전달
        displayStationMarkers(results, selectedIndex);
      }
    },
    [results, displayStationMarkers]
  );

  // 지도 로드 후 중간 위치 찾기
  useEffect(() => {
    if (!isMapLoaded || users.length === 0) return;

    const fetchMiddleLocations = async () => {
      const middleResults = await findMiddleLocations(users);

      if (middleResults.length > 0) {
        // 사용자 마커 표시
        displayUserMarkers(users);
        // 중간 역 마커 표시
        displayStationMarkers(middleResults, null);
      }
    };

    fetchMiddleLocations();
  }, [isMapLoaded, users]);

  // 선택된 역이 변경될 때마다 마커를 업데이트합니다.
  useEffect(() => {
    updateStationMarkers(selectedStationIndex);
  }, [selectedStationIndex, updateStationMarkers]);

  // 역 선택 시 경로 그리기
  const handleSelectStation = async (index: number) => {
    if (selectedStationIndex === index) {
      // 같은 역을 다시 클릭하면 선택 해제
      setSelectedStationIndex(null);
      clearPolylines();
      setDetailedRoutes(new Map());
      return;
    }

    setSelectedStationIndex(index);
    setIsDrawingRoutes(true);

    try {
      const selectedStation = results[index].station;

      // 경로 그리기와 함께 상세 경로 정보도 가져오기 (이미 ODsay API에서 가져온 정보 재사용)
      const detailedRoutesList = await drawRoutePolylines(
        users,
        selectedStation
      );

      // 자동차 사용자의 경우 기본 정보 추가
      const allDetailedRoutes: UserDetailedRoute[] = users.map((user) => {
        const existingRoute = detailedRoutesList.find(
          (r) => r.userName === user.name
        );
        if (existingRoute) {
          return existingRoute;
        }
        // 자동차 사용자 또는 경로를 찾지 못한 경우
        return {
          userName: user.name,
          segments: [],
          totalTime:
            results[index].userTimes.find((ut) => ut.userName === user.name)
              ?.travelTime || 0,
          transferCount: 0,
        };
      });

      // 상세 경로 정보 저장
      setDetailedRoutes((prev) => {
        const newMap = new Map(prev);
        newMap.set(index, allDetailedRoutes);
        return newMap;
      });
    } catch (err) {
      console.error("경로 그리기 오류:", err);
      alert("경로를 그리는 중 오류가 발생했습니다.");
    } finally {
      setIsDrawingRoutes(false);
    }
  };

  const handleNext = () => {
    if (selectedStationIndex === null) return;
    const selectedStation = results[selectedStationIndex].station;
    navigate('/result', { state: { station: selectedStation } });
  };

  return (
    <div className='fixed inset-0 overflow-hidden'>
      {/* 지도 */}
      <div
        id='kakao-map'
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
        }}
      />

      {/* 로딩 중 오버레이 */}
      {(!isMapLoaded || isLoading) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-100'>
          <div className='text-center'>
            <div className='text-lg font-semibold text-gray-700 mb-2'>
              {!isMapLoaded ? '지도를 불러오는 중...' : '중간 위치를 찾는 중...'}
            </div>
            <div className='text-sm text-gray-500'>잠시만 기다려주세요</div>
          </div>
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-100'>
          <div className='text-center max-w-md px-4'>
            <div className='text-red-600 text-lg font-semibold mb-2'>오류가 발생했습니다</div>
            <div className='text-sm text-gray-600 mb-4'>{error}</div>
            <button
              onClick={() => navigate('/')}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              처음으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className='fixed top-0 left-0 right-0 z-20 bg-white shadow-md'>
        <div className='flex items-center justify-between px-4 py-3'>
          <button
            onClick={() => navigate('/')}
            className='text-gray-600 hover:text-gray-800 font-medium text-sm'
          >
            ← 돌아가기
          </button>
          <h1 className='text-lg font-bold text-gray-800'>중간 위치 찾기</h1>
          <div className='w-20'></div> {/* 중앙 정렬을 위한 공간 */}
        </div>
      </div>

      {/* 하단 패널 - 중간 위치 리스트 */}
      <div className='fixed bottom-0 left-0 right-0 z-20 rounded-t-xl bg-white shadow-2xl max-h-[50vh] overflow-y-auto'>
        {/* 드래그 핸들 */}
        <div className='flex justify-center py-2 bg-white sticky top-0 z-10'>
          <div className='h-1 w-8 rounded-full bg-gray-300' />
        </div>

        {/* 결과가 없을 때 */}
        {results.length === 0 && !isLoading && (
          <div className='px-4 pb-6 text-center'>
            <div className='text-gray-500 text-sm py-8'>중간 위치를 찾을 수 없습니다.</div>
          </div>
        )}

        {/* 중간 위치 리스트 */}
        {results.length > 0 && (
          <div className='px-4 pb-4'>
            <div className='mb-3'>
              <h3 className='text-sm font-bold text-gray-700'>
                📍 추천 중간 위치 ({results.length}개)
              </h3>
              <p className='text-xs text-gray-500 mt-1'>
                역을 선택하면 각 사용자의 경로를 확인할 수 있습니다
              </p>
            </div>

            <div className='space-y-2'>
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectStation(index)}
                  disabled={isDrawingRoutes}
                  className={cn(
                    "w-full text-left rounded-lg border-2 p-3 transition-all",
                    selectedStationIndex === index
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-purple-300",
                    isDrawingRoutes && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* 역 이름 및 순위 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white",
                          index === 0 ? "bg-purple-600" : "bg-gray-400"
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className='font-bold text-gray-800 text-sm'>{result.station.name}</span>
                      <span className='text-xs text-gray-500'>({result.station.category})</span>
                    </div>
                    {selectedStationIndex === index && (
                      <span className='text-purple-600 text-xs font-medium'>✓ 선택됨</span>
                    )}
                  </div>

                  {/* 통계 정보 */}
                  <div className='grid grid-cols-3 gap-2 text-center bg-gray-50 rounded p-2'>
                    <div>
                      <div className='text-xs text-gray-500'>평균 시간</div>
                      <div className='text-sm font-bold text-blue-600'>
                        {Math.round(result.averageTime)}분
                      </div>
                    </div>
                    <div>
                      <div className='text-xs text-gray-500'>최대 시간</div>
                      <div className='text-sm font-bold text-orange-600'>
                        {Math.round(result.maxTime)}분
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">시간 차이</div>
                      <div className="text-sm font-bold text-green-600">
                        {Math.round(result.timeDifference)}분
                      </div>
                    </div>
                  </div>

                  {/* 각 사용자별 시간 및 상세 경로 */}
                  <div className="mt-2 space-y-2">
                    {result.userTimes.map((userTime, idx) => {
                      const isSelected = selectedStationIndex === index;
                      const userDetailedRoute = isSelected
                        ? detailedRoutes
                            .get(index)
                            ?.find((r) => r.userName === userTime.userName)
                        : null;

                      return (
                        <div key={idx} className="bg-white rounded px-2 py-1">
                          {/* 사용자 이름 및 시간/환승 정보 */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700 font-semibold text-sm">
                                {userTime.userName}
                              </span>
                              {isSelected && userDetailedRoute && (
                                <>
                                  {userDetailedRoute.transferCount > 0 && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      환승 {userDetailedRoute.transferCount}회
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            <span
                              className={cn(
                                isSelected
                                  ? "font-medium"
                                  : "text-gray-600 text-xs"
                              )}
                            >
                              {Math.round(userTime.travelTime)}분
                            </span>
                          </div>

                          {/* 경로 요약 바 (선택된 경우에만 표시) */}
                          {isSelected &&
                            userDetailedRoute &&
                            userDetailedRoute.segments.length > 0 && (
                              <div className="mt-2 h-5 bg-gray-200 rounded-xl flex items-center overflow-hidden">
                                {userDetailedRoute.segments
                                  .filter(
                                    (segment) =>
                                      !(
                                        segment.trafficType === 3 &&
                                        segment.sectionTime === 0
                                      )
                                  )
                                  .map((segment, segIdx) => {
                                    const isWalking = segment.trafficType === 3;
                                    const isBus = segment.trafficType === 2;

                                    // 색상 결정
                                    const bgColor = isWalking
                                      ? undefined
                                      : isBus
                                        ? "#3498DB"
                                        : getLaneColor(
                                            segment.trafficType,
                                            segment.laneName
                                          );

                                    return (
                                      <div
                                        key={segIdx}
                                        className="h-full flex items-center justify-center px-2 flex-1 rounded-xl"
                                        style={
                                          bgColor
                                            ? { backgroundColor: bgColor }
                                            : undefined
                                        }
                                      >
                                        <span
                                          className={cn(
                                            "text-xs font-medium whitespace-nowrap",
                                            isWalking
                                              ? "text-gray-700"
                                              : "text-white"
                                          )}
                                        >
                                          {segment.sectionTime}분
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}

                          {/* 상세 경로 정보 (선택된 경우에만 표시) */}
                          {isSelected && userDetailedRoute && (
                            <div className="mt-2 space-y-1.5 pl-2">
                              {userDetailedRoute.segments.filter(
                                (seg) => seg.trafficType !== 3
                              ).length > 0 ? (
                                userDetailedRoute.segments
                                  .filter((seg) => seg.trafficType !== 3)
                                  .map(
                                    (
                                      segment: {
                                        laneName: string;
                                        startName: string;
                                        endName: string;
                                        sectionTime: number;
                                        trafficType: number;
                                      },
                                      segIdx: number
                                    ) => {
                                      const laneColor = getLaneColor(
                                        segment.trafficType,
                                        segment.laneName
                                      );

                                      return (
                                        <div
                                          key={segIdx}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{
                                              backgroundColor: laneColor,
                                            }}
                                          />
                                          <span className="text-gray-700 font-medium">
                                            {segment.laneName}
                                          </span>
                                          <span className="text-gray-600">
                                            {segment.startName} -{" "}
                                            {segment.endName}
                                          </span>
                                        </div>
                                      );
                                    }
                                  )
                              ) : (
                                <div className="text-xs text-gray-500">
                                  상세 경로 정보가 없습니다
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 경로 그리는 중 */}
        {isDrawingRoutes && (
          <div className='px-4 pb-3 text-center'>
            <div className='text-sm text-blue-600 font-medium'>경로를 그리는 중...</div>
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {selectedStationIndex !== null && !isDrawingRoutes && (
          <div className='sticky bottom-0 p-4 bg-white border-t border-gray-100'>
            <button
              onClick={() => {
                const selectedResult = results[selectedStationIndex];
                navigate('/result', {
                  state: {
                    station: selectedResult.station,
                    users: users,
                  },
                });
              }}
              className='w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg'
            >
              이 장소 선택하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MiddleLocationPage;
