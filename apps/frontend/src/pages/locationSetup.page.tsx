// LocationSetupPage.tsx
import { useState } from 'react';
import { useInitailMap } from '@/features/kakaoMap/hooks/useInitailMap';
import { useTransitRoute } from '@/features/kakaoMap/hooks/useTransitRoute';
import { useGeocode } from '@/features/kakaoMap/hooks/useGeocode';
import { useUserMarkers } from '@/features/kakaoMap/hooks/useUserMarkers';

function LocationSetupPage() {
  const { isMapLoaded, mapRef } = useInitailMap();

  const {
    searchTransitRoute,
    routes,
    selectedRouteIndex,
    selectRoute,
    isSearching: isRouteSearching
  } = useTransitRoute(mapRef);

  const {
    query,
    setQuery,
    suggestions,
    selectedAddress,
    isSearching: isGeocodeSearching,
    showDropdown,
    setShowDropdown,
    selectAddress,
    clearQuery,
  } = useGeocode();

  const {
    users,
    addUser,
    removeUser,
    clearAllUsers,
  } = useUserMarkers(mapRef);

  const [userName, setUserName] = useState('');

  const handleRouteSearch = () => {
    searchTransitRoute(127.073745786, 37.208885158, 127.123411119, 37.384999516);
  };

  const handleAddUser = () => {
    if (!userName.trim()) {
      alert('사용자 이름을 입력해주세요.');
      return;
    }

    if (!selectedAddress) {
      alert('주소를 선택해주세요.');
      return;
    }

    addUser(
      userName,
      selectedAddress.roadAddress,
      parseFloat(selectedAddress.x),
      parseFloat(selectedAddress.y)
    );

    // 입력 필드 초기화
    setUserName('');
    clearQuery();
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

      {/* 하단 패널 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 rounded-t-xl bg-white shadow-2xl max-h-[70vh] overflow-y-auto">
        {/* 드래그 핸들 */}
        <div className="flex justify-center py-2 bg-white sticky top-0 z-10">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* 사용자 추가 섹션 */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">👥 사용자 위치 추가</h3>

          {/* 사용자 이름 입력 */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="사용자 이름"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={!isMapLoaded}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 주소 검색 입력 */}
          <div className="mb-2 relative">
            <input
              type="text"
              placeholder="주소를 입력하세요 (예: 분당구 불정로 6)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              disabled={!isMapLoaded}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            {/* 드롭다운 주소 목록 */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                {suggestions.map((addr, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      selectAddress(addr);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-800">{addr.roadAddress}</div>
                    <div className="text-xs text-gray-500">{addr.jibunAddress}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 추가 버튼 */}
          <button
            onClick={handleAddUser}
            disabled={!isMapLoaded || !userName.trim() || !query.trim()}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            ➕ 사용자 추가
          </button>
        </div>

        {/* 추가된 사용자 목록 */}
        {users.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-gray-700">추가된 사용자 ({users.length})</h4>
              <button
                onClick={clearAllUsers}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                전체 삭제
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.address}</div>
                  </div>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="ml-2 text-red-600 hover:text-red-700 text-xs font-medium shrink-0"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 경로 탐색 버튼 */}
        <div className="px-4 pb-3 border-t border-gray-200 pt-3">
          <button
            onClick={handleRouteSearch}
            disabled={isRouteSearching}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRouteSearching ? '검색 중...' : '🚇 경로 탐색하기 (테스트)'}
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
