import type { ReactNode } from 'react'
import { LogoKo } from '@/shared/assets'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => {
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <LogoKo className="h-8 w-auto cursor-pointer" onClick={() => navigate('/')} />
      </div>
      <div className="flex items-center gap-5">{children}</div>
    </header>
  )
}
