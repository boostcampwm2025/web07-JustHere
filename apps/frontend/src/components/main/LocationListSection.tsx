import { useState } from "react";
import {
  MagnifyIcon,
  CloseIcon,
  StarIcon,
  PlusIcon,
  ListBoxOutlineIcon,
  VoteIcon,
  CreationIcon,
} from "@/components/Icons";

interface Location {
  id: number;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  isAiRecommended: boolean;
  image: string | null;
}

type TabType = "locations" | "candidates";
type FilterType = "all" | "ai" | "search";

function LocationListSection() {
  const [activeTab, setActiveTab] = useState<TabType>("locations");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const locations: Location[] = [
    {
      id: 1,
      name: "브루클린 더 버거 조인트",
      category: "버거 | 분위기 좋은",
      rating: 4.5,
      reviewCount: 128,
      isAiRecommended: true,
      image: null,
    },
    {
      id: 2,
      name: "마녀주방 강남점",
      category: "칵테일바 | 조용한",
      rating: 4.5,
      reviewCount: 128,
      isAiRecommended: false,
      image: null,
    },
    {
      id: 3,
      name: "김밥천국",
      category: "한식 | 시끄러움",
      rating: 0,
      reviewCount: 0,
      isAiRecommended: true,
      image: null,
    },
    {
      id: 4,
      name: "마녀주방 강남점",
      category: "칵테일바 | 조용한",
      rating: 4.5,
      reviewCount: 128,
      isAiRecommended: true,
      image: null,
    },
  ];

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "ai", label: "AI 추천" },
    { id: "search", label: "검색" },
  ];

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "locations",
      label: "장소 리스트",
      icon: <ListBoxOutlineIcon className="w-4 h-4" />,
    },
    {
      id: "candidates",
      label: "후보 리스트",
      icon: <VoteIcon className="w-4 h-4" />,
    },
  ];

  const filteredLocations = locations.filter((location) => {
    if (activeFilter === "ai") return location.isAiRecommended;
    if (activeFilter === "search" && searchQuery) {
      return location.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col w-96 h-full bg-white border-l border-gray-200">
      {/* Header Section */}
      <div className="flex flex-col gap-4 p-5 pb-0">
        {/* Tab Buttons */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 h-9 rounded-lg font-bold text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <MagnifyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색"
            className="w-full h-12 pl-10 pr-10 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray hover:text-black"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 pb-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${
                activeFilter === filter.id
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Location List */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-4">
          {filteredLocations.map((location, index) => (
            <div key={location.id}>
              <article className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                  {location.image ? (
                    <img
                      src={location.image}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  {/* Top Section */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-gray-800 text-base line-clamp-1 flex-1 pr-2">
                        {location.name}
                      </h3>
                      {location.rating > 0 && (
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-0.5">
                            <StarIcon className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="font-bold text-yellow-400 text-xs">
                              {location.rating}
                            </span>
                          </div>
                          {location.reviewCount > 0 && (
                            <span className="text-gray-400 text-[8px]">
                              리뷰 {location.reviewCount}개
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-gray text-xs line-clamp-1">
                      {location.category}
                    </p>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {location.isAiRecommended && (
                        <span className="inline-flex items-center gap-1 px-2.5 h-5 bg-black text-white text-[9px] font-bold rounded-full">
                          <CreationIcon className="w-2.5 h-2.5" />
                          AI 추천
                        </span>
                      )}
                    </div>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                      <span className="font-bold text-gray-800 text-xs">
                        추가
                      </span>
                      <PlusIcon className="w-3.5 h-3.5 text-gray-800" />
                    </button>
                  </div>
                </div>
              </article>

              {/* Divider between items */}
              {index < filteredLocations.length - 1 && (
                <div className="h-px bg-gray-100 mt-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Button */}
      <div className="p-5 pt-0">
        <button className="w-full flex items-center justify-center gap-1.5 px-5 py-3 bg-primary hover:bg-primary-pressed text-white font-semibold rounded-full transition-colors">
          장소 목록 뽑기~
        </button>
      </div>
    </div>
  );
}

export default LocationListSection;
