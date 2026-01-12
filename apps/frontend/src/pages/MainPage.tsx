import Header from "@/components/Header";
import WhiteboardSection from "@/components/main/WhiteboardSection";
import LocationListSection from "@/components/main/LocationListSection";

function MainPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <WhiteboardSection />
        <LocationListSection />
      </div>
    </div>
  );
}

export default MainPage;
