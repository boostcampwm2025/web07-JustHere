import { useState } from "react";
import { Search, X, Check, MapPin, Users } from "lucide-react";

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
        {/* 진행도 바 */}
        {/* TODO 컴포넌트로 빼기 */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {/* Step 1 - Active */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-primary">지역 선택</span>
          </div>

          {/* Progress Line */}
          <div className="w-24 h-0.5 bg-gray-200 -mt-6" />

          {/* Step 2 - Inactive */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-disable" />
            </div>
            <span className="text-xs font-medium text-gray-disable">
              사용자 초대
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-medium text-black text-center mb-8">
          만날 지역을 선택해보세요
        </h1>

        {/* Map Preview */}
        <div className="w-full h-36 bg-gray-100 rounded-xl mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-gray-200" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-primary-bg border-2 border-primary rounded-lg px-2 py-1 text-xs text-primary font-medium">
              강남역
            </div>
          </div>
          <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 w-6 h-6 text-primary" />
        </div>

        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="장소를 검색하세요"
            className="w-full h-12 pl-12 pr-12 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Results Count */}
        <p className="text-sm text-gray mb-3">
          검색 결과 ({searchResults.length})
        </p>

        {/* Search Results List */}
        <div className="flex flex-col gap-3 mb-6">
          {searchResults.map((result) => {
            const isSelected = selectedId === result.id;
            return (
              <button
                key={result.id}
                onClick={() => setSelectedId(result.id)}
                className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-colors text-left ${
                  isSelected
                    ? "bg-primary-bg border-primary"
                    : "bg-white border-gray-300 hover:border-gray"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-black">
                    {result.name}
                  </span>
                  <span className="text-xs text-gray">{result.address}</span>
                </div>
                {isSelected && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          disabled={!selectedLocation}
          className="w-full h-13 bg-primary hover:bg-primary-pressed disabled:bg-gray-disable text-white font-bold text-base rounded-xl transition-colors py-4"
        >
          참여자 초대하기
        </button>
      </div>
    </main>
  );
}

export default LocationStep;
