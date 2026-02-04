import { useRef, useState, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { PostIt } from '@/shared/types'
import { POST_IT_HEIGHT, BASE_PADDING, TEXT_FONT_SIZE, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '@/pages/room/constants'

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

function measureTextHeight(text: string, width: number, scale: number): number {
  const padding = BASE_PADDING * scale
  const measureNode = new Konva.Text({
    text,
    fontSize: TEXT_FONT_SIZE * scale,
    fontFamily: TEXT_FONT_FAMILY,
    lineHeight: TEXT_LINE_HEIGHT,
    width: width - padding * 2,
    wrap: 'word',
  })
  const height = measureNode.height() + padding * 2
  measureNode.destroy()
  return Math.max(POST_IT_HEIGHT * scale, height)
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
  const [editingHeight, setEditingHeight] = useState<number | null>(null)
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

  const scaledPadding = BASE_PADDING * (postIt.scale || 1)

  const syncHeight = useCallback(() => {
    const scale = postIt.scale || 1
    const defaultHeight = POST_IT_HEIGHT * scale

    if (!textareaRef.current) return defaultHeight

    const ta = textareaRef.current
    ta.style.height = '0px'
    const newHeight = Math.max(defaultHeight, ta.scrollHeight)
    ta.style.height = `${newHeight}px`
    setEditingHeight(newHeight)
    return newHeight
  }, [postIt.scale])

  const handleDblClick = () => {
    draftRef.current = postIt.text
    onEditStart()
    setIsEditing(true)
  }

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    draftRef.current = e.target.value

    const newHeight = syncHeight()

    if (!isComposingRef.current) {
      const updates: Partial<Omit<PostIt, 'id'>> = { text: e.target.value }
      if (Math.abs(newHeight - postIt.height) > 1) {
        updates.height = newHeight
      }
      onChange(updates)
    }
  }

  const commit = (nextText?: string) => {
    const value = nextText ?? draftRef.current
    const scale = postIt.scale || 1
    const newHeight = value ? measureTextHeight(value, postIt.width, scale) : POST_IT_HEIGHT * scale

    const updates: Partial<Omit<PostIt, 'id'>> = { text: value }
    if (Math.abs(newHeight - postIt.height) > 1) {
      updates.height = newHeight
    }
    if (value !== postIt.text || updates.height) {
      onChange(updates)
    }
  }

  const handleBlur = () => {
    commit()
    setEditingHeight(null)
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

  const renderHeight = editingHeight !== null ? Math.max(postIt.height, editingHeight) : postIt.height

  return (
    <Group
      ref={groupRef}
      x={postIt.x}
      y={postIt.y}
      width={postIt.width}
      height={renderHeight}
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
        height={renderHeight}
        fill={postIt.fill}
        cornerRadius={8 * (postIt.scale || 1)}
        shadowBlur={15}
        shadowOffsetY={4}
        shadowOpacity={0.1}
        onDblClick={handleDblClick}
      />

      {isEditing ? (
        <Html
          transform
          divProps={{
            className: 'absolute top-0 left-0',
            style: {
              width: `${postIt.width}px`,
              height: `${renderHeight}px`,
              overflow: 'hidden',
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
              const newHeight = syncHeight()
              const updates: Partial<Omit<PostIt, 'id'>> = { text: value }
              if (Math.abs(newHeight - postIt.height) > 1) {
                updates.height = newHeight
              }
              onChange(updates)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="border-none bg-transparent resize-none outline-none font-sans text-[#333] placeholder:text-gray-disable"
            style={{
              width: `${postIt.width}px`,
              height: `${renderHeight}px`,
              fontSize: `${TEXT_FONT_SIZE * (postIt.scale || 1)}px`,
              padding: `${scaledPadding}px`,
              lineHeight: TEXT_LINE_HEIGHT,
              fontFamily: TEXT_FONT_FAMILY,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          />
        </Html>
      ) : (
        <Text
          text={postIt.text || '내용을 입력하세요'}
          x={scaledPadding}
          y={scaledPadding}
          width={postIt.width - scaledPadding * 2}
          fontSize={TEXT_FONT_SIZE * postIt.scale}
          fontFamily={TEXT_FONT_FAMILY}
          fill={postIt.text ? '#00000A' : '#9FA4A9'}
          lineHeight={TEXT_LINE_HEIGHT}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}
    </Group>
  )
}
