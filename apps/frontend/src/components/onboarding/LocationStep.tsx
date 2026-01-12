import { useState } from "react";
import {
  CheckIcon,
  MapMarkerIcon,
  MapCheckOutlineIcon,
  AccountCheckOutlineIcon,
} from "@/components/Icons";
import { Button } from "@/components/common/Button";
import { SearchInput } from "@/components/common/SearchInput";
import { cn } from "@/utils/cn";

interface SearchResult {
  id: number;
  name: string;
  address: string;
}

interface LocationStepProps {
  onNext: (location: { name: string; address: string }) => void;
}

function LocationStep({ onNext }: LocationStepProps) {
  const [searchQuery, setSearchQuery] = useState("강남역");
  const [selectedId, setSelectedId] = useState<number>(1);

  const searchResults: SearchResult[] = [
    { id: 1, name: "강남역(2호선)", address: "서울 강남구 강남대로 396" },
    { id: 2, name: "강남역(신분당선)", address: "서울 강남구 강남대로 396" },
    { id: 3, name: "스타벅스 강남역점", address: "서울 강남구 강남대로 396" },
  ];

  const selectedLocation = searchResults.find((r) => r.id === selectedId);

  const handleNext = () => {
    if (selectedLocation) {
      onNext({
        name: selectedLocation.name,
        address: selectedLocation.address,
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
        <div className="w-full h-36 bg-gray-100 rounded-xl mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-gray-200" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-primary-bg border-2 border-primary rounded-lg px-2 py-1 text-xs text-primary font-medium">
              강남역
            </div>
          </div>
          <MapMarkerIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 w-6 h-6 text-primary" />
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

        <div className="flex flex-col gap-3 mb-6">
          {searchResults.map((result) => {
            const isSelected = selectedId === result.id;
            return (
              <button
                key={result.id}
                onClick={() => setSelectedId(result.id)}
                className={cn(
                  "flex items-center justify-between px-5 py-4 rounded-xl border transition-colors text-left",
                  {
                    "bg-primary-bg border-primary": isSelected,
                    "bg-white border-gray-300 hover:border-gray": !isSelected,
                  },
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-black">
                    {result.name}
                  </span>
                  <span className="text-xs text-gray">{result.address}</span>
                </div>
                {isSelected && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleNext}
          disabled={!selectedLocation}
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
