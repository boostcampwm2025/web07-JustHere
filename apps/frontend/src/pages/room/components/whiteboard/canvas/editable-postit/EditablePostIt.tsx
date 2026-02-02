import { useRef, useState, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { PostIt } from '@/shared/types'
import { POST_IT_HEIGHT } from '@/pages/room/constants'

interface EditablePostItProps {
  postIt: PostIt
  draggable: boolean
  onDragEnd: (x: number, y: number) => void
  onChange: (updates: Partial<Omit<PostIt, 'id'>>) => void
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onEditStart: () => void
  onEditEnd: () => void
  shapeRef?: (node: Konva.Group | null) => void
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void
}

export const EditablePostIt = ({
  postIt,
  draggable,
  onDragEnd,
  onChange,
  onMouseDown,
  onSelect,
  onEditStart,
  onEditEnd,
  shapeRef,
  onTransformEnd,
}: EditablePostItProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const isComposingRef = useRef(false)
  const draftRef = useRef(postIt.text)

  const groupRef = useRef<Konva.Group>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (shapeRef) {
      shapeRef(groupRef.current)
    }
  }, [shapeRef])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const basePadding = 10
  const scaledPadding = basePadding * (postIt.scale || 1)

  const measureAndResize = useCallback(
    (text: string) => {
      if (!text) return

      const scale = postIt.scale || 1
      const fontSize = 14 * scale
      const padding = basePadding * scale

      const measureNode = new Konva.Text({
        text,
        fontSize,
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.4,
        width: postIt.width - padding * 2,
        wrap: 'word',
      })
      const measuredHeight = measureNode.height() + padding * 2
      measureNode.destroy()

      const defaultHeight = POST_IT_HEIGHT * scale
      const newHeight = Math.max(defaultHeight, measuredHeight)

      if (Math.abs(newHeight - postIt.height) > 1) {
        onChange({ height: newHeight })
      }
    },
    [postIt.width, postIt.height, postIt.scale, onChange],
  )

  const handleDblClick = () => {
    draftRef.current = postIt.text
    onEditStart()
    setIsEditing(true)
  }

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    draftRef.current = e.target.value
    if (!isComposingRef.current) {
      onChange({ text: e.target.value })
      measureAndResize(e.target.value)
    }
  }

  const commit = (nextText?: string) => {
    const value = nextText ?? draftRef.current
    if (value !== postIt.text) onChange({ text: value })
    measureAndResize(value)
  }

  const handleBlur = () => {
    commit()
    setIsEditing(false)
    onEditEnd()
  }

  // Enter 키 (Shift 없이) → 편집 종료
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ;(e.target as HTMLTextAreaElement).blur()
    }
  }

  return (
    <Group
      ref={groupRef}
      x={postIt.x}
      y={postIt.y}
      width={postIt.width}
      height={postIt.height}
      draggable={draggable && !isEditing}
      onDragEnd={e => {
        onDragEnd(e.target.x(), e.target.y())
      }}
      onMouseDown={onMouseDown}
      onClick={onSelect}
      onContextMenu={onSelect}
      onTransformEnd={onTransformEnd}
    >
      {/* 포스트잇 배경 */}
      <Rect
        width={postIt.width}
        height={postIt.height}
        fill={postIt.fill}
        shadowBlur={5}
        cornerRadius={8 * (postIt.scale || 1)}
        onDblClick={handleDblClick}
      />

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
            placeholder="내용을 입력하세요"
            onChange={handleTextChange}
            onCompositionStart={() => (isComposingRef.current = true)}
            onCompositionEnd={e => {
              isComposingRef.current = false
              const value = (e.target as HTMLTextAreaElement).value
              onChange({ text: value })
              measureAndResize(value)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full border-none bg-transparent resize-none outline-none font-sans text-sm text-[#333] p-2.5 leading-[1.4] placeholder:text-gray-400"
            style={{
              fontSize: `${14 * (postIt.scale || 1)}px`,
              padding: `${scaledPadding}px`,
            }}
          />
        </Html>
      ) : (
        <Text
          text={postIt.text || '내용을 입력하세요'}
          x={scaledPadding}
          y={scaledPadding}
          width={postIt.width - scaledPadding * 2}
          fontSize={14 * postIt.scale}
          fontFamily="Arial, sans-serif"
          fill={postIt.text ? '#333' : '#9CA3AF'}
          lineHeight={1.4}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}
    </Group>
  )
}
