// LocationSetupPage.tsx
import { useRef } from 'react';
import { useInitailMap } from '@/features/kakaoMap/hooks/useInitailMap';
import { useLocalSearch } from '@/features/kakaoMap/hooks/useLocalSearch';
import { useTransitRoute } from '@/features/kakaoMap/hooks/useTransitRoute';

function LocationSetupPage() {
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const infoWindowRef = useRef<kakao.maps.InfoWindow | null>(null);

  const { isMapLoaded, mapRef } = useInitailMap();
  const {
    searchKakaoLocal,
    isSearching,
    keyword,
    setKeyword,
  } = useLocalSearch(markersRef, infoWindowRef, mapRef);

  const {
    searchTransitRoute,
    routes,
    selectedRouteIndex,
    selectRoute,
    isSearching: isRouteSearching
  } = useTransitRoute(mapRef);

  const handleRouteSearch = () => {
    searchTransitRoute(127.073745786, 37.208885158, 127.123411119, 37.384999516);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') searchKakaoLocal();
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* 지도 - fixed로 전체 화면 */}
      <div 
        id="kakao-map" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0
        }} 
      />
      
      {!isMapLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 text-gray-600">
          지도를 불러오는 중...
        </div>
      )}

      {/* 검색창 */}
      <div className="fixed left-1/2 top-4 z-20 w-full max-w-md -translate-x-1/2 px-4">
        <div className="flex gap-2 rounded-lg bg-white p-2 shadow-lg">
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching || !isMapLoaded}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          />
          <button
            onClick={searchKakaoLocal}
            disabled={isSearching || !isMapLoaded}
            className="shrink-0 rounded bg-[#fee500] px-4 py-2 text-sm font-medium text-[#3c1e1e] hover:bg-[#e6cf00] disabled:bg-gray-300"
          >
            {isSearching ? '...' : '검색'}
          </button>
        </div>
      </div>

      {/* 하단 패널 - 컴팩트하게 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 rounded-t-xl bg-white shadow-2xl">
        {/* 드래그 핸들 */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* 경로 탐색 버튼 */}
        <div className="px-4 pb-3">
          <button
            onClick={handleRouteSearch}
            disabled={isRouteSearching}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRouteSearching ? '검색 중...' : '🚇 경로 탐색하기'}
          </button>
        </div>

        {/* 경로 결과 */}
        {routes.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto border-t border-gray-100">
            {/* 경로 선택 탭 */}
            <div className="flex gap-1.5 overflow-x-auto bg-gray-50 p-2">
              {routes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => selectRoute(idx)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs transition-all ${
                    idx === selectedRouteIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <div className="font-bold">{route.info.totalTime}분</div>
                  <div className="opacity-80">{route.info.payment.toLocaleString()}원</div>
                </button>
              ))}
            </div>

            {/* 선택된 경로 상세 */}
            {routes[selectedRouteIndex] && (
              <div className="p-3">
                {/* 요약 */}
                <div className="mb-3 flex justify-between rounded-lg bg-blue-50 p-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-500">시간</div>
                    <div className="font-bold text-blue-600">{routes[selectedRouteIndex].info.totalTime}분</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">요금</div>
                    <div className="font-bold text-blue-600">{routes[selectedRouteIndex].info.payment.toLocaleString()}원</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">거리</div>
                    <div className="font-bold text-blue-600">{(routes[selectedRouteIndex].info.totalDistance / 1000).toFixed(1)}km</div>
                  </div>
                </div>

                {/* 경로 */}
                <div className="text-xs font-medium text-gray-500 mb-2">경로 상세</div>
                <div className="space-y-1.5">
                  {routes[selectedRouteIndex].subPath.map((subPath, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded bg-gray-50 p-2 text-xs">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        {subPath.trafficType === 1 && (
                          <span className="text-blue-600">🚇 {subPath.lane?.[0]?.name} · {subPath.sectionTime}분</span>
                        )}
                        {subPath.trafficType === 2 && (
                          <span className="text-green-600">🚌 {subPath.lane?.[0]?.busNo} · {subPath.sectionTime}분</span>
                        )}
                        {subPath.trafficType === 3 && (
                          <span className="text-gray-600">🚶 도보 · {subPath.sectionTime}분 · {subPath.distance}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSetupPage;
