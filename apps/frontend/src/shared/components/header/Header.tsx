import Logo from '@/assets/images/logo.svg?react'
import { Button, BellIcon, CogIcon } from '@/shared/ui'

export const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Logo />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="gray" size="icon" className="w-9 h-9">
          <BellIcon className="w-5 h-5" />
        </Button>
        <Button variant="gray" size="icon" className="w-9 h-9">
          <CogIcon className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
