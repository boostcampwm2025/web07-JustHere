import { Button, CursorIcon, HandBackRightIcon, NoteTextIcon, PencilIcon, RedoIcon, UndoIcon } from '@/shared/ui'
import { cn } from '@/shared/utils'

type Tool = 'cursor' | 'hand' | 'pencil' | 'postIt'

type ToolConfig = {
  tool: Tool
  icon: React.ReactNode
  resetCursor?: boolean
}

const TOOLBAR_TOOLS: ToolConfig[] = [
  {
    tool: 'cursor',
    icon: <CursorIcon className="w-5 h-5" />,
    resetCursor: true,
  },
  {
    tool: 'hand',
    icon: <HandBackRightIcon className="w-5 h-5" />,
    resetCursor: true,
  },
  {
    tool: 'pencil',
    icon: <PencilIcon className="w-5 h-5" />,
    resetCursor: true,
  },
  {
    tool: 'postIt',
    icon: <NoteTextIcon className="w-5 h-5" />,
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
    { key: 'undo', icon: <UndoIcon className="w-5 h-5" />, onClick: undo, disabled: !canUndo },
    { key: 'redo', icon: <RedoIcon className="w-5 h-5" />, onClick: redo, disabled: !canRedo },
  ]

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center p-1.5 bg-white rounded-full shadow-xl border border-gray-200 gap-1">
        {TOOLBAR_TOOLS.map(({ tool, icon, resetCursor }) => (
          <Button
            key={tool}
            size="icon"
            variant="gray"
            icon={icon}
            className={cn('rounded-full bg-transparent', effectiveTool === tool ? 'text-primary' : 'text-gray-400 hover:text-gray-900')}
            onClick={() => onClickTool(tool, resetCursor ?? false)}
          />
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {ACTION_ITEMS.map(({ key, icon, onClick, disabled }) => (
          <Button
            key={key}
            size="icon"
            variant="gray"
            icon={icon}
            className={cn('rounded-full bg-transparent', disabled ? 'text-gray-400' : 'text-gray-900')}
            onClick={onClick}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
