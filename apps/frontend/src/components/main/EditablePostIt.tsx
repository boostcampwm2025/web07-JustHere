import { useRef, useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import type Konva from 'konva'
import type { PostIt } from '@/types/canvas.types'

interface EditablePostItProps {
  postIt: PostIt
  draggable: boolean
  isSelected: boolean
  onDragEnd: (x: number, y: number) => void
  onChange: (updates: Partial<Omit<PostIt, 'id'>>) => void
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
}

function EditablePostIt({ postIt, draggable, onDragEnd, onChange, onMouseDown, onSelect, isSelected }: EditablePostItProps) {
  const [isEditing, setIsEditing] = useState(false)
  const isComposingRef = useRef(false)
  const draftRef = useRef(postIt.text)

  const groupRef = useRef<Konva.Group>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 편집 모드 진입 시 textarea에 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // 더블클릭 → 편집 모드
  const handleDblClick = () => {
    draftRef.current = postIt.text
    setIsEditing(true)
  }

  // 텍스트 변경 → 실시간 동기화
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    draftRef.current = e.target.value
    if (!isComposingRef.current) {
      onChange({ text: e.target.value })
    }
  }

  const commit = (nextText?: string) => {
    const value = nextText ?? draftRef.current
    if (value !== postIt.text) onChange({ text: value })
  }

  // 편집 종료
  const handleBlur = () => {
    commit()
    setIsEditing(false)
  }

  // Enter 키 (Shift 없이) → 편집 종료
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit((e.target as HTMLTextAreaElement).value)
      setIsEditing(false)
    }
  }

  return (
    <Group
      ref={groupRef}
      x={postIt.x}
      y={postIt.y}
      draggable={draggable && !isEditing} // 편집 중에는 드래그 불가
      onDragEnd={e => {
        onDragEnd(e.target.x(), e.target.y())
      }}
      // mouseDown에서 즉시 선택 전환
      onMouseDown={onMouseDown}
      // 좌클릭 / 우클릭(contextmenu) 모두 Selection 핸들러 호출
      onClick={onSelect}
      onContextMenu={onSelect}
    >
      {/* focus box */}
      <Rect
        width={postIt.width}
        height={postIt.height}
        fill={postIt.fill}
        shadowBlur={5}
        cornerRadius={8}
        onDblClick={handleDblClick}
        stroke={isSelected ? '#3b82f6' : undefined}
      />

      {/* 편집 모드: HTML textarea */}
      {isEditing ? (
        <Html
          transform
          divProps={{
            className: 'absolute top-0 left-0',
            style: {
              width: `${postIt.width}px`,
              height: `${postIt.height}px`,
            },
          }}
        >
          <textarea
            ref={textareaRef}
            defaultValue={postIt.text}
            onChange={handleTextChange}
            onCompositionStart={() => (isComposingRef.current = true)}
            onCompositionEnd={e => {
              isComposingRef.current = false
              onChange({ text: (e.target as HTMLTextAreaElement).value })
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full border-none bg-transparent resize-none outline-none font-sans text-sm text-[#333] p-2.5 leading-[1.4]"
          />
        </Html>
      ) : (
        /* 일반 모드: Konva Text */
        <Text
          text={postIt.text}
          x={10}
          y={10}
          width={postIt.width - 20}
          height={postIt.height - 40}
          fontSize={14}
          fontFamily="Arial, sans-serif"
          fill="#333"
          lineHeight={1.4}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}
    </Group>
  )
}

export default EditablePostIt
