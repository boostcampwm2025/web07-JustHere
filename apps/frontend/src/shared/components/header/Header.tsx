import type { ReactNode } from 'react'
import { LogoKo } from '@/shared/assets'
import { Link } from 'react-router-dom'

interface HeaderProps {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Link to="/" aria-label="홈으로 이동" className="inline-flex">
          <LogoKo className="h-10 w-auto cursor-pointer" />
        </Link>
      </div>
      <div className="flex items-center gap-5">{children}</div>
    </header>
  )
}
