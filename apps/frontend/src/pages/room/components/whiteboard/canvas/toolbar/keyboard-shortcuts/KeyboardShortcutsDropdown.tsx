import { useState } from 'react'
import { HelpCircleIcon } from '@/shared/assets'
import { Button, Divider, Dropdown, Tooltip } from '@/shared/components'

const SHORTCUTS = [
  { key: 'Space bar', description: '누르는 동안 이동 도구 전환' },
  { key: 'Backspace', description: '선택된 캔버스 요소 삭제' },
  { key: 'ESC', description: '선택 도구 전환' },
  { key: '/', description: '마우스 채팅' },
  { key: 'Ctrl + 마우스 휠', description: '줌 인/아웃' },
  { key: '마우스 우클릭', description: '추가 옵션' },
]

export const KeyboardShortcutsDropdown = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Tooltip content="키보드 단축키" position="bottom">
        <Button
          size="icon"
          variant="gray"
          className="rounded-full bg-transparent text-gray-400 hover:text-gray-900"
          aria-label="키보드 단축키 안내"
          onClick={() => setOpen(prev => !prev)}
        >
          <HelpCircleIcon className="size-5" />
        </Button>
      </Tooltip>

      {open && (
        <Dropdown onOpenChange={setOpen} align="right" className="w-80 p-4">
          <h3 className="font-semibold mb-3">키보드 단축키</h3>
          <Divider className="mb-3" />
          <div className="space-y-2">
            {SHORTCUTS.map(shortcut => (
              <div key={shortcut.key} className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-lg">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </Dropdown>
      )}
    </div>
  )
}
