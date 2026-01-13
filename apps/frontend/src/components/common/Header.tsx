import { useState } from "react";
import {
  BellIcon,
  CogIcon,
  ShareVariantIcon,
  MapCheckOutlineIcon,
} from "@/components/Icons";
import { AVATARS } from "@/mocks";
import RoomInfoModal from "@/components/main/RoomInfoModal";

export default function Header() {
  const [isRoomInfoModalOpen, setIsRoomInfoModalOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
          <MapCheckOutlineIcon className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-black font-['Plus_Jakarta_Sans']">
          Just Here
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center -space-x-2">
          {AVATARS.map((src, i) => (
            <div
              key={i}
              className="overflow-hidden border-2 border-white rounded-full w-9 h-9 bg-gray-200"
            >
              <img
                src={src}
                alt="User"
                className="object-cover w-full h-full"
              />
            </div>
          ))}
          <div className="z-10 flex items-center justify-center -ml-2 border-2 border-white rounded-full w-9 h-9 bg-gray-100">
            <span className="text-xs font-medium text-gray-800">+2</span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsRoomInfoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary-pressed"
            >
              <ShareVariantIcon className="w-[18px] h-[18px]" />
              <span className="text-sm font-bold">Share</span>
            </button>
            <RoomInfoModal
              isOpen={isRoomInfoModalOpen}
              onClose={() => setIsRoomInfoModalOpen(false)}
            />
          </div>

          <button className="flex items-center justify-center transition-colors rounded-lg w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-800">
            <BellIcon className="w-5 h-5" />
          </button>

          <button className="flex items-center justify-center transition-colors rounded-lg w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-800">
            <CogIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
