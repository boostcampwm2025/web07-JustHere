import { useState } from 'react'
import { BellIcon, CogIcon, ShareVariantIcon, MapCheckOutlineIcon } from '@/components/Icons'
import { AVATARS } from '@/mocks'
import RoomInfoModal from '@/components/main/RoomInfoModal'
import { Button } from '@/components/common/Button'

export default function Header() {
  const [isRoomInfoModalOpen, setIsRoomInfoModalOpen] = useState(false)

  const MAX_DISPLAY_AVATARS = 3
  const displayAvatars = AVATARS.slice(0, MAX_DISPLAY_AVATARS)
  const extraCount = AVATARS.length - MAX_DISPLAY_AVATARS

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
          <MapCheckOutlineIcon className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-black font-['Plus_Jakarta_Sans']">Just Here</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center -space-x-2">
          {displayAvatars.map((src, i) => (
            <div key={i} className="overflow-hidden border-2 border-white rounded-full w-9 h-9 bg-gray-200">
              <img src={src} alt="User" className="object-cover w-full h-full" />
            </div>
          ))}
          {extraCount > 0 && (
            <div className="z-10 flex items-center justify-center -ml-2 border-2 border-white rounded-full w-9 h-9 bg-gray-100">
              <span className="text-xs font-medium text-gray-800">+{extraCount}</span>
            </div>
          )}
        </div>

        <div className="w-[1px] h-6 bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              icon={<ShareVariantIcon className="w-[18px] h-[18px]" />}
              onClick={() => setIsRoomInfoModalOpen(true)}
            >
              Share
            </Button>
            <RoomInfoModal isOpen={isRoomInfoModalOpen} onClose={() => setIsRoomInfoModalOpen(false)} />
          </div>

          <Button variant="gray" size="icon" className="w-9 h-9">
            <BellIcon className="w-5 h-5" />
          </Button>

          <Button variant="gray" size="icon" className="w-9 h-9">
            <CogIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
