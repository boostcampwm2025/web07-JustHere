import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInitailMap } from "@/features/kakaoMap/hooks/useInitailMap";
import { useMiddleLocation } from "@/features/middleLocation/hooks/useMiddleLocation";
import { useMiddleMap } from "@/features/middleLocation/hooks/useMiddleMap";
import type { UserLocation } from "@web07/types";

function MiddleLocationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMapLoaded, mapRef } = useInitailMap();
  const { results, isLoading, error, findMiddleLocations } =
    useMiddleLocation();
  const {
    displayUserMarkers,
    displayStationMarkers,
    drawRoutePolylines,
    clearPolylines,
  } = useMiddleMap(mapRef);

  const [selectedStationIndex, setSelectedStationIndex] = useState<
    number | null
  >(null);
  const [isDrawingRoutes, setIsDrawingRoutes] = useState(false);

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
        displayStationMarkers(middleResults);
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
      return;
    }

    setSelectedStationIndex(index);
    setIsDrawingRoutes(true);

    try {
      const selectedStation = results[index].station;
      await drawRoutePolylines(users, selectedStation);
    } catch (err) {
      console.error("경로 그리기 오류:", err);
      alert("경로를 그리는 중 오류가 발생했습니다.");
    } finally {
      setIsDrawingRoutes(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* 지도 */}
      <div
        id="kakao-map"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">
              {!isMapLoaded
                ? "지도를 불러오는 중..."
                : "중간 위치를 찾는 중..."}
            </div>
            <div className="text-sm text-gray-500">잠시만 기다려주세요</div>
          </div>
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100">
          <div className="text-center max-w-md px-4">
            <div className="text-red-600 text-lg font-semibold mb-2">
              오류가 발생했습니다
            </div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              처음으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            ← 돌아가기
          </button>
          <h1 className="text-lg font-bold text-gray-800">중간 위치 찾기</h1>
          <div className="w-20"></div> {/* 중앙 정렬을 위한 공간 */}
        </div>
      </div>

      {/* 하단 패널 - 중간 위치 리스트 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 rounded-t-xl bg-white shadow-2xl max-h-[50vh] overflow-y-auto">
        {/* 드래그 핸들 */}
        <div className="flex justify-center py-2 bg-white sticky top-0 z-10">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* 결과가 없을 때 */}
        {results.length === 0 && !isLoading && (
          <div className="px-4 pb-6 text-center">
            <div className="text-gray-500 text-sm py-8">
              중간 위치를 찾을 수 없습니다.
            </div>
          </div>
        )}

        {/* 중간 위치 리스트 */}
        {results.length > 0 && (
          <div className="px-4 pb-4">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-700">
                📍 추천 중간 위치 ({results.length}개)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                역을 선택하면 각 사용자의 경로를 확인할 수 있습니다
              </p>
            </div>

            <div className="space-y-2">
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectStation(index)}
                  disabled={isDrawingRoutes}
                  className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                    selectedStationIndex === index
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  } ${isDrawingRoutes ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {/* 역 이름 및 순위 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-purple-600 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-bold text-gray-800 text-sm">
                        {result.station.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({result.station.category})
                      </span>
                    </div>
                    {selectedStationIndex === index && (
                      <span className="text-purple-600 text-xs font-medium">
                        ✓ 선택됨
                      </span>
                    )}
                  </div>

                  {/* 통계 정보 */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded p-2">
                    <div>
                      <div className="text-xs text-gray-500">평균 시간</div>
                      <div className="text-sm font-bold text-blue-600">
                        {Math.round(result.averageTime)}분
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">최대 시간</div>
                      <div className="text-sm font-bold text-orange-600">
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

                  {/* 각 사용자별 시간 */}
                  <div className="mt-2 space-y-1">
                    {result.userTimes.map((userTime, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs bg-white rounded px-2 py-1"
                      >
                        <span className="text-gray-700 font-medium">
                          {userTime.userName}
                        </span>
                        <span className="text-gray-600">
                          {Math.round(userTime.travelTime)}분
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 경로 그리는 중 */}
        {isDrawingRoutes && (
          <div className="px-4 pb-3 text-center">
            <div className="text-sm text-blue-600 font-medium">
              경로를 그리는 중...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MiddleLocationPage;
