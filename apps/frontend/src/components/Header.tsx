import { MapPin } from "lucide-react";

function Header() {
  return (
    <header className="flex items-center gap-2 px-6 py-4 bg-white border-b border-gray-200">
      <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
        <MapPin className="w-4 h-4 text-white" />
      </div>
      <span className="font-semibold text-black">Just Here</span>
    </header>
  );
}

export default Header;
