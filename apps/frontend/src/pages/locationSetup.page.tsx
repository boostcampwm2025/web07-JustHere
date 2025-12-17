// LocationSetupPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInitailMap } from "@/features/kakaoMap/hooks/useInitailMap";
import { useGeocode } from "@/features/kakaoMap/hooks/useGeocode";
import { useUserMarkers } from "@/features/kakaoMap/hooks/useUserMarkers";

function LocationSetupPage() {
  const navigate = useNavigate();
  const { isMapLoaded, mapRef } = useInitailMap();

  const {
    query,
    setQuery,
    suggestions,
    selectedAddress,
    showDropdown,
    setShowDropdown,
    selectAddress,
    clearQuery,
  } = useGeocode();

  const { users, addUser, removeUser, clearAllUsers } = useUserMarkers(mapRef);

  const [userName, setUserName] = useState("");

  const handleFindMiddleLocation = () => {
    if (users.length < 2) {
      alert("최소 2명 이상의 사용자를 추가해주세요.");
      return;
    }

    // 중간 위치 찾기 페이지로 이동 (사용자 데이터 전달)
    navigate("/middle", { state: { users } });
  };

  const handleAddUser = () => {
    if (!userName.trim()) {
      alert("사용자 이름을 입력해주세요.");
      return;
    }

    if (!selectedAddress) {
      alert("주소를 선택해주세요.");
      return;
    }

    // 도로명 주소 우선, 없으면 지번 주소 사용
    const addressToDisplay =
      selectedAddress.road_address?.address_name ||
      selectedAddress.address?.address_name ||
      selectedAddress.address_name;

    addUser(
      userName,
      addressToDisplay,
      parseFloat(selectedAddress.x),
      parseFloat(selectedAddress.y)
    );

    // 입력 필드 초기화
    setUserName("");
    clearQuery();
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* 지도 - fixed로 전체 화면 */}
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
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            👥 사용자 위치 추가
          </h3>

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
                {suggestions.map((addr, idx) => {
                  // 도로명 주소와 지번 주소 추출
                  const roadAddress = addr.road_address?.address_name || "";
                  const jibunAddress =
                    addr.address?.address_name || addr.address_name;
                  const buildingName = addr.road_address?.building_name || "";

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        selectAddress(addr);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      {roadAddress && (
                        <div className="text-sm font-medium text-gray-800">
                          {roadAddress} {buildingName && `(${buildingName})`}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {jibunAddress}
                      </div>
                    </button>
                  );
                })}
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
              <h4 className="text-sm font-bold text-gray-700">
                추가된 사용자 ({users.length})
              </h4>
              <button
                onClick={clearAllUsers}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                전체 삭제
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.address}
                    </div>
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

        {/* 중앙 위치 찾기 버튼 */}
        <div className="px-4 pb-3 border-t border-gray-200 pt-3">
          <button
            onClick={handleFindMiddleLocation}
            disabled={!isMapLoaded || users.length < 2}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300"
          >
            {`📍 중앙 위치 찾기 (${users.length}명)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationSetupPage;
