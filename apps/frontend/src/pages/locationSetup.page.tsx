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

  // 테스트용: 당산 → 합정 경로 검색
  const handleRouteSearch = () => {
    searchTransitRoute(127.073745786, 37.208885158, 127.123411119, 37.384999516);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') searchKakaoLocal();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-gray-200 bg-black p-5 h-32">
        <input
          type="text"
          placeholder="검색어를 입력하세요 (예: 맛집, 카페)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSearching || !isMapLoaded}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        />
        <button
          onClick={searchKakaoLocal}
          disabled={isSearching || !isMapLoaded}
          className="rounded bg-[#fee500] px-4 py-2 font-medium text-[#3c1e1e] hover:bg-[#e6cf00] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <button onClick={handleRouteSearch} disabled={isRouteSearching}>
            {isRouteSearching ? '검색 중...' : '경로 검색'}
          </button>
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </div>
      {/* 경로 선택 UI */}
      {routes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto bg-gray-50 p-3">
          {routes.map((route, idx) => (
            <button
              key={idx}
              onClick={() => selectRoute(idx)}
              className={`shrink-0 rounded-lg p-3 text-sm ${idx === selectedRouteIndex
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700'
                }`}
            >
              <div className="font-bold">{route.info.totalTime}분</div>
              <div className="text-xs">{route.info.payment.toLocaleString()}원</div>
              <div className="text-xs">
                {route.pathType === 1 ? '🚇 지하철' : '🚌 버스'}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <div style={{ height: '100vh' }} id="kakao-map" className="h-full w-full" />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600">
            지도를 불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSetupPage;
