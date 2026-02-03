import { useRef, useState, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { TextBox } from '@/shared/types'
import { TEXT_BOX_HEIGHT, BASE_PADDING, TEXT_FONT_SIZE, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '@/pages/room/constants'

interface EditableTextBoxProps {
  textBox: TextBox
  draggable: boolean
  isSelected: boolean
  onDragEnd: (x: number, y: number) => void
  onChange: (updates: Partial<Omit<TextBox, 'id'>>) => void
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
  return Math.max(TEXT_BOX_HEIGHT * scale, height)
}

export const EditableTextBox = ({
  textBox,
  draggable,
  isSelected,
  onDragEnd,
  onChange,
  onMouseDown,
  onSelect,
  onEditStart,
  onEditEnd,
  shapeRef,
  onTransformEnd,
}: EditableTextBoxProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingHeight, setEditingHeight] = useState<number | null>(null)
  const isComposingRef = useRef(false)
  const draftRef = useRef(textBox.text)
  const groupRef = useRef<Konva.Group>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (shapeRef) shapeRef(groupRef.current)
    return () => {
      if (shapeRef) shapeRef(null)
    }
  }, [shapeRef])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const scaledPadding = BASE_PADDING * (textBox.scale || 1)

  const syncHeight = useCallback(() => {
    const scale = textBox.scale || 1
    const defaultHeight = TEXT_BOX_HEIGHT * scale

    if (!textareaRef.current) return defaultHeight

    const ta = textareaRef.current
    ta.style.height = '0px'
    const newHeight = Math.max(defaultHeight, ta.scrollHeight)
    ta.style.height = `${newHeight}px`
    setEditingHeight(newHeight)
    return newHeight
  }, [textBox.scale])

  const handleDblClick = () => {
    draftRef.current = textBox.text
    onEditStart()
    setIsEditing(true)
  }

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    draftRef.current = e.target.value

    // 높이는 조합 중이든 아니든 항상 즉시 반영
    const newHeight = syncHeight()

    // 텍스트 동기화는 조합 완료 후에만
    if (!isComposingRef.current) {
      const updates: Partial<Omit<TextBox, 'id'>> = { text: e.target.value }
      if (Math.abs(newHeight - textBox.height) > 1) {
        updates.height = newHeight
      }
      onChange(updates)
    }
  }

  const commit = (nextText?: string) => {
    const value = nextText ?? draftRef.current
    const scale = textBox.scale || 1
    const newHeight = value ? measureTextHeight(value, textBox.width, scale) : TEXT_BOX_HEIGHT * scale

    const updates: Partial<Omit<TextBox, 'id'>> = { text: value }
    if (Math.abs(newHeight - textBox.height) > 1) {
      updates.height = newHeight
    }
    if (value !== textBox.text || updates.height) {
      onChange(updates)
    }
  }

  const handleBlur = () => {
    commit()
    setEditingHeight(null)
    setIsEditing(false)
    onEditEnd()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ;(e.target as HTMLTextAreaElement).blur()
    }
  }

  const showBorder = isSelected || isHovered || isEditing
  const renderHeight = editingHeight !== null ? Math.max(textBox.height, editingHeight) : textBox.height

  return (
    <Group
      ref={groupRef}
      x={textBox.x}
      y={textBox.y}
      width={textBox.width}
      height={renderHeight}
      draggable={draggable && !isEditing}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={e => {
        setIsDragging(false)
        onDragEnd(e.target.x(), e.target.y())
      }}
      onMouseDown={onMouseDown}
      onClick={onSelect}
      onContextMenu={onSelect}
      onTransformEnd={onTransformEnd}
      onMouseEnter={() => !isDragging && setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
    >
      <Rect
        width={textBox.width}
        height={renderHeight}
        fill="transparent"
        stroke={showBorder ? '#9CA3AF' : 'transparent'}
        strokeWidth={showBorder ? 1 : 0}
        dash={[4, 4]}
        onDblClick={handleDblClick}
      />

      {isEditing ? (
        <Html
          transform
          divProps={{
            style: { width: `${textBox.width}px`, height: `${renderHeight}px`, overflow: 'hidden' },
          }}
        >
          <textarea
            ref={textareaRef}
            defaultValue={textBox.text}
            placeholder="텍스트를 입력하세요"
            onChange={handleTextChange}
            onCompositionStart={() => (isComposingRef.current = true)}
            onCompositionEnd={e => {
              isComposingRef.current = false
              const value = (e.target as HTMLTextAreaElement).value
              const newHeight = syncHeight()
              const updates: Partial<Omit<TextBox, 'id'>> = { text: value }
              if (Math.abs(newHeight - textBox.height) > 1) {
                updates.height = newHeight
              }
              onChange(updates)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="border-none bg-transparent resize-none outline-none font-sans text-[#333] placeholder:text-gray-400"
            style={{
              width: `${textBox.width}px`,
              height: `${renderHeight}px`,
              fontSize: `${TEXT_FONT_SIZE * (textBox.scale || 1)}px`,
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
          text={textBox.text || '텍스트를 입력하세요'}
          x={scaledPadding}
          y={scaledPadding}
          width={Math.max(1, textBox.width - scaledPadding * 2)}
          fontSize={TEXT_FONT_SIZE * textBox.scale}
          fontFamily={TEXT_FONT_FAMILY}
          fill={textBox.text ? '#333' : '#9CA3AF'}
          lineHeight={TEXT_LINE_HEIGHT}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}
    </Group>
  )
}
