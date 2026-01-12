import { useRef, useEffect, useState } from "react";
import {
  CheckIcon,
  MapCheckOutlineIcon,
  AccountCheckOutlineIcon,
} from "@/components/Icons";
import { Button } from "@/components/common/Button";
import { SearchInput } from "@/components/common/SearchInput";
import { cn } from "@/utils/cn";
import { useKakaoMap } from "@/hooks/useKakaoMap";
import type { KakaoPlace, KakaoMap, KakaoMarker } from "@/types/kakao";
import { useDebounce } from "@/hooks/useDebounce";

interface LocationStepProps {
  onNext: (location: { name: string; address: string }) => void;
}

function LocationStep({ onNext }: LocationStepProps) {
  const [searchQuery, setSearchQuery] = useState("강남역");
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const { isLoaded, searchPlaces } = useKakaoMap();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (
      isLoaded &&
      mapContainerRef.current &&
      !mapRef.current &&
      window.kakao
    ) {
      const options = {
        center: new window.kakao.maps.LatLng(37.498095, 127.02761),
        level: 3,
        draggable: false,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      const marker = new window.kakao.maps.Marker({
        position: options.center,
        map: map,
      });
      markerRef.current = marker;
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) return;

    searchPlaces(debouncedSearchQuery, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(result);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        setSearchResults([]);
      }
    });
  }, [debouncedSearchQuery, searchPlaces]);

  useEffect(() => {
    if (selectedPlace && mapRef.current && markerRef.current && window.kakao) {
      const moveLatLon = new window.kakao.maps.LatLng(
        Number(selectedPlace.y),
        Number(selectedPlace.x),
      );

      mapRef.current.setCenter(moveLatLon);
      markerRef.current.setMap(mapRef.current);
      markerRef.current.setPosition(moveLatLon);
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [searchResults]);

  const handleNext = () => {
    if (selectedPlace) {
      onNext({
        name: selectedPlace.place_name,
        address: selectedPlace.road_address_name || selectedPlace.address_name,
      });
    }
  };

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm p-12">
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MapCheckOutlineIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-primary">지역 선택</span>
          </div>

          <div className="w-24 h-0.5 bg-gray-200 -mt-6" />

          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <AccountCheckOutlineIcon className="w-5 h-5 text-gray-disable" />
            </div>
            <span className="text-xs font-medium text-gray-disable">
              사용자 초대
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-medium text-black text-center mb-8">
          만날 지역을 선택해보세요
        </h1>
        <div
          ref={mapContainerRef}
          className="w-full h-80 bg-gray-100 rounded-xl mb-6 overflow-hidden relative z-0"
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-sm">지도 로딩 중...</span>
            </div>
          )}

          {selectedPlace && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <div className="bg-primary-bg border-2 border-primary rounded-lg px-2 py-1 text-xs text-primary font-medium mb-1 whitespace-nowrap shadow-sm">
                {selectedPlace.place_name}
              </div>
            </div>
          )}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="장소를 검색하세요"
          containerClassName="mb-2"
        />

        <p className="text-sm text-gray mb-3">
          검색 결과 ({searchResults.length})
        </p>

        <div
          ref={listContainerRef}
          className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar"
        >
          {searchResults.map((result) => {
            const isSelected = selectedPlace?.id === result.id;
            return (
              <button
                key={result.id}
                onClick={() => setSelectedPlace(result)}
                className={cn(
                  "flex items-center justify-between px-5 py-4 rounded-xl border transition-colors text-left w-full shrink-0",
                  {
                    "bg-primary-bg border-primary": isSelected,
                    "bg-white border-gray-300 hover:border-gray": !isSelected,
                  },
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-black">
                    {result.place_name}
                  </span>
                  <span className="text-xs text-gray">
                    {result.road_address_name || result.address_name}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleNext}
          disabled={!selectedPlace}
          size="lg"
          className="py-4 text-base font-bold"
        >
          참여자 초대하기
        </Button>
      </div>
    </main>
  );
}

export default LocationStep;
