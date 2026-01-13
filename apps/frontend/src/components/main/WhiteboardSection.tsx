import { Button } from "@/components/Button";
import KakaoMap from "@/components/KakaoMap";
import WhiteboardCanvas from "@/components/main/WhiteboardCanvas.tsx";
import { cn } from "@/utils/cn.ts";
import { useState } from "react";
import {
  SilverwareForkKnifeIcon,
  CoffeeIcon,
  LiquorIcon,
  PlusIcon,
} from "@/components/Icons";

type TabType = "restaurant" | "cafe" | "bar";
type ToggleType = "map" | "canvas";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

function WhiteboardSection() {
  const [activeTab, setActiveTab] = useState<TabType>("restaurant");

  const [viewMode, setViewMode] = useState<ToggleType>("canvas");

  const tabs: Tab[] = [
    {
      id: "restaurant",
      label: "음식점",
      icon: <SilverwareForkKnifeIcon className="w-4 h-4" />,
    },
    { id: "cafe", label: "카페", icon: <CoffeeIcon className="w-4 h-4" /> },
    { id: "bar", label: "술집", icon: <LiquorIcon className="w-4 h-4" /> },
  ];

  // TODO: [아진] 해당 버튼 스타일이 많이 사용되면 Button 컴포넌트를 확장한 ToggleButton을 따로 만들어도 좋을 것 같음.
  // 토글 버튼 공통 스타일
  const toggleButtonBaseClass = "rounded-full transition-all duration-200";

  // 토글 활성화 스타일
  const activeClass =
    "bg-primary hover:bg-primary-pressed ring-primary text-white shadow-md";

  // 토글 비활성화 스타일
  const inactiveClass =
    "text-gray hover:bg-gray-bg hover:text-black bg-transparent";

  return (
    <section className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Tab Header */}
      <header className="flex items-end gap-1 px-4 pt-3 bg-slate-100 border-b border-gray-200">
        <nav className="flex items-end gap-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-xl border-t border-x border-slate-300 transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-50 border-l"
                  : "bg-slate-200 hover:bg-slate-150"
              }`}
            >
              {tab.icon}
              <span className="font-bold text-gray-800 text-sm">
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Add Tab Button */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 transition-colors mb-1"
          aria-label="새 탭 추가"
        >
          <PlusIcon className="w-5 h-5 text-gray-800" />
        </button>
      </header>

      {/* Whiteboard Canvas */}
      <main
        className="flex-1 bg-slate-50 overflow-hidden relative"
        role="tabpanel"
      >
        {viewMode === "canvas" ? (
          // TODO: 화이트보드 캔버스 구현
          <WhiteboardCanvas />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <KakaoMap />
          </div>
        )}

        {/* 4. 하단 중앙 토글 버튼 (Floating UI) */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex p-1 bg-white rounded-full shadow-lg border border-slate-200">
            {/* Canvas Mode Button */}
            <Button
              size="sm"
              variant={viewMode === "canvas" ? "primary" : "ghost"}
              onClick={() => setViewMode("canvas")}
              className={cn(
                toggleButtonBaseClass,
                viewMode === "canvas" ? activeClass : inactiveClass,
              )}
            >
              캔버스
            </Button>

            {/* Map Mode Button */}
            <Button
              size="sm"
              variant={viewMode === "map" ? "primary" : "ghost"}
              onClick={() => setViewMode("map")}
              className={cn(
                toggleButtonBaseClass,
                viewMode === "map" ? activeClass : inactiveClass,
              )}
            >
              지도
            </Button>
          </div>
        </div>
      </main>
    </section>
  );
}

export default WhiteboardSection;
