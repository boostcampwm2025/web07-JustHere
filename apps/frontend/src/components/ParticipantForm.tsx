import { useState, useEffect, useRef, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { createRoom } from "@/api/rooms";
import { createParticipant } from "@/api/participants";
import { cn } from "@/lib/cn";

interface ParticipantFormProps {
  onRoomCreated?: (roomId: number) => void;
  onParticipantsChange?: (participants: LocalParticipant[]) => void;
}

interface PlaceSearchResult {
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string; // 경도
  y: string; // 위도
}

interface LocalParticipant {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
}

export function ParticipantForm({
  onRoomCreated,
  onParticipantsChange,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [transportMode, setTransportMode] = useState<
    "CAR" | "PUBLIC_TRANSPORT"
  >("PUBLIC_TRANSPORT");
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);
  const [nextParticipantId, setNextParticipantId] = useState(1);

  const createRoomMutation = useMutation({
    mutationFn: createRoom,
  });

  const searchTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 장소 검색 함수
  const searchPlaces = (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(
      keyword,
      (data: PlaceSearchResult[], status: any) => {
        setIsSearching(false);

        if (status === window.kakao.maps.services.Status.OK) {
          setSearchResults(data.slice(0, 10)); // 최대 10개만 표시
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          setSearchResults([]);
        } else {
          setSearchResults([]);
        }
      },
      {
        size: 10, // 최대 10개 결과
      }
    );
  };

  // 검색어 입력 시 debounce 처리
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery && !selectedPlace) {
        searchPlaces(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedPlace]);

  // 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    setSearchQuery(place.place_name);
    setSearchResults([]);
    setShowResults(false);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedPlace(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !selectedPlace) {
      alert("이름과 장소를 모두 입력해주세요.");
      return;
    }

    // 로컬 상태에 참여자 추가
    const newParticipant: LocalParticipant = {
      id: nextParticipantId,
      name,
      address: selectedPlace.road_address_name || selectedPlace.address_name,
      lat: parseFloat(selectedPlace.y),
      lng: parseFloat(selectedPlace.x),
      transportMode,
    };

    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    setNextParticipantId(nextParticipantId + 1);
    onParticipantsChange?.(updatedParticipants);

    // 폼 초기화
    setName("");
    setSearchQuery("");
    setSelectedPlace(null);
    setSearchResults([]);
    setTransportMode("PUBLIC_TRANSPORT");
  };

  const handleFindMidpoint = async () => {
    if (participants.length < 2) {
      alert("최소 2명 이상의 참여자가 필요합니다.");
      return;
    }

    try {
      // 방 생성
      const room = await createRoomMutation.mutateAsync();

      // 모든 참여자를 서버에 추가
      const participantPromises = participants.map((participant) =>
        createParticipant(room.id, {
          name: participant.name,
          address: participant.address,
          lat: participant.lat,
          lng: participant.lng,
          transportMode: participant.transportMode,
        })
      );

      await Promise.all(participantPromises);

      // 방 생성 완료 콜백 호출
      onRoomCreated?.(room.id);
    } catch (error) {
      console.error("방 생성 실패:", error);
      alert("방 생성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleDeleteParticipant = (id: number) => {
    const updatedParticipants = participants.filter((p) => p.id !== id);
    setParticipants(updatedParticipants);
    onParticipantsChange?.(updatedParticipants);
  };

  const hasMinimumParticipants = participants.length >= 2;

  const transportModeLabels = {
    CAR: "자동차",
    PUBLIC_TRANSPORT: "대중교통",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-xl font-bold">어디서 만날까요?</h3>
        <p className="text-sm text-gray-600 mt-1">
          만나는 사람들의 위치를 입력해주세요
        </p>
      </div>

      {/* 참여자 목록 */}
      {participants.length > 0 && (
        <div className="space-y-2">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="p-3 bg-white border border-gray-200 rounded-md flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm">
                    {participant.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-8">
                  {participant.address}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    participant.transportMode === "PUBLIC_TRANSPORT"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {transportModeLabels[participant.transportMode]}
                </span>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="수정"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteParticipant(participant.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="삭제"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이동 수단 선택 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTransportMode("PUBLIC_TRANSPORT")}
          className={cn(
            "w-full py-2 rounded-md font-medium transition-colors",
            transportMode === "PUBLIC_TRANSPORT"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          대중교통
        </button>
        <button
          type="button"
          onClick={() => setTransportMode("CAR")}
          className={cn(
            "w-full py-2 rounded-md font-medium transition-colors",
            transportMode === "CAR"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          자동차
        </button>
      </div>

      {/* 추가 버튼 */}
      <div className="flex gap-2 text-sm">
        <input
          type="text"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          required
        />
        <div className="flex-1 relative" ref={inputRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="주소나 장소명을 입력하세요"
              value={searchQuery}
              onChange={handleAddressChange}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-gray-400 text-xs">검색 중...</span>
              </div>
            )}
            {!isSearching && searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlace(null);
                  setSearchResults([]);
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((place, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePlaceSelect(place)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-sm text-gray-900">
                    {place.place_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {place.road_address_name || place.address_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!name || !selectedPlace}
          className={cn(
            "w-12 h-10 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center justify-center",
            (!name || !selectedPlace) && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="text-xl">+</span>
        </button>
      </div>

      {/* 중간 위치 찾기 버튼 */}
      {hasMinimumParticipants && (
        <button
          type="button"
          onClick={handleFindMidpoint}
          disabled={createRoomMutation.isPending}
          className={cn(
            "w-full bg-green-500 text-white py-3 rounded-md hover:bg-green-600 font-medium transition-colors flex items-center justify-center gap-2",
            createRoomMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          {createRoomMutation.isPending ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>처리 중...</span>
            </>
          ) : (
            <>
              <span className="text-lg">◎</span>
              <span>중간 위치 찾기</span>
            </>
          )}
        </button>
      )}

      {/* 에러 메시지 */}
      {createRoomMutation.isError && (
        <div className="p-3 border border-red-500 bg-red-50 rounded-md">
          <p className="text-sm text-red-500">
            방 생성에 실패했습니다. 다시 시도해주세요.
          </p>
        </div>
      )}
    </form>
  );
}
