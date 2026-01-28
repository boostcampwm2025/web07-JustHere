import { CursorIcon, HandBackRightIcon, NoteTextIcon, PencilIcon, RedoIcon, UndoIcon, TextIcon, HelpCircleIcon } from '@/shared/assets'
import type { ToolType } from '@/shared/types'
import { Button, Tooltip } from '@/shared/components'
import { cn } from '@/shared/utils'
import { KeyboardShortcutsDropdown } from './keyboard-shortcuts'

type Tool = ToolType

type ToolConfig = {
  tool: Tool
  icon: React.ReactNode
  label: string
  resetCursor?: boolean
}

const TOOLBAR_TOOLS: ToolConfig[] = [
  {
    tool: 'cursor',
    icon: <CursorIcon className="w-5 h-5" />,
    label: '선택',
    resetCursor: true,
  },
  {
    tool: 'hand',
    icon: <HandBackRightIcon className="w-5 h-5" />,
    label: '이동',
    resetCursor: true,
  },
  {
    tool: 'pencil',
    icon: <PencilIcon className="w-5 h-5" />,
    label: '연필',
    resetCursor: true,
  },
  {
    tool: 'postIt',
    icon: <NoteTextIcon className="w-5 h-5" />,
    label: '포스트잇',
  },
  {
    tool: 'textBox',
    icon: <TextIcon className="w-5 h-5" />,
    label: '텍스트',
  },
]

interface ToolbarProps {
  effectiveTool: Tool
  setActiveTool: (tool: Tool) => void
  setCursorPos: (pos: { x: number; y: number } | null) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export const Toolbar = ({ effectiveTool, setActiveTool, setCursorPos, undo, redo, canUndo, canRedo }: ToolbarProps) => {
  const onClickTool = (tool: Tool, resetCursor: boolean) => {
    setActiveTool(tool)
    if (resetCursor) {
      setCursorPos(null)
    }
  }

  const ACTION_ITEMS = [
    { key: 'undo', icon: <UndoIcon className="w-5 h-5" />, label: '실행 취소', onClick: undo, disabled: !canUndo },
    { key: 'redo', icon: <RedoIcon className="w-5 h-5" />, label: '다시 실행', onClick: redo, disabled: !canRedo },
  ]

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center p-1.5 bg-white rounded-full shadow-xl border border-gray-200 gap-1">
        {TOOLBAR_TOOLS.map(({ tool, icon, label, resetCursor }) => (
          <Tooltip key={tool} content={label} position="bottom">
            <Button
              size="icon"
              variant="gray"
              icon={icon}
              className={cn('rounded-full bg-transparent', effectiveTool === tool ? 'text-primary' : 'text-gray-400 hover:text-gray-900')}
              onClick={() => onClickTool(tool, resetCursor ?? false)}
            />
          </Tooltip>
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {ACTION_ITEMS.map(({ key, icon, label, onClick, disabled }) => (
          <Tooltip key={key} content={label} position="bottom">
            <Button
              size="icon"
              variant="gray"
              icon={icon}
              className={cn('rounded-full bg-transparent', disabled ? 'text-gray-400' : 'text-gray-900')}
              onClick={onClick}
              disabled={disabled}
            />
          </Tooltip>
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Tooltip content="키보드 단축키" position="bottom">
          <KeyboardShortcutsDropdown
            trigger={
              <Button
                size="icon"
                variant="gray"
                className="rounded-full bg-transparent text-gray-400 hover:text-gray-900"
                aria-label="키보드 단축키 안내"
              >
                <HelpCircleIcon className="size-5" />
              </Button>
            }
          />
        </Tooltip>
      </div>
    </div>
  )
}
