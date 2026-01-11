import { useState } from "react";
import { UtensilsCrossed, Coffee, Wine, Plus } from "lucide-react";

type TabType = "restaurant" | "cafe" | "bar";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

function WhiteboardSection() {
  const [activeTab, setActiveTab] = useState<TabType>("restaurant");

  const tabs: Tab[] = [
    {
      id: "restaurant",
      label: "음식점",
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    { id: "cafe", label: "카페", icon: <Coffee className="w-4 h-4" /> },
    { id: "bar", label: "술집", icon: <Wine className="w-4 h-4" /> },
  ];

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
          <Plus className="w-5 h-5 text-gray-800" />
        </button>
      </header>

      {/* Whiteboard Canvas */}
      <main
        className="flex-1 bg-slate-50 overflow-hidden relative"
        role="tabpanel"
      >
        {/* TODO: 화이트보드 캔버스 구현 */}
      </main>
    </section>
  );
}

export default WhiteboardSection;
