import type { ReactNode } from 'react'
import { LogoKo } from '@/shared/assets'

const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPod/i.test(navigator.userAgent)

interface MobileGuardProps {
  children: ReactNode
}

export function MobileGuard({ children }: MobileGuardProps) {
  if (!isMobile) return <>{children}</>

  return (
    <div lang="ko" className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-gray-bg">
      <LogoKo className="w-48 h-fit" aria-hidden="true" />
      <h1 className="text-gray text-center leading-relaxed text-base font-normal">PC 환경에서 이용해주세요.</h1>
      <p className="text-gray text-center leading-relaxed">이 서비스는 PC에 최적화되어 있습니다.</p>
    </div>
  )
}
