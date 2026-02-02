import { useRef, useState, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { TextBox } from '@/shared/types'
import { TEXT_BOX_HEIGHT } from '@/pages/room/constants'

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

  const basePadding = 10
  const scaledPadding = basePadding * (textBox.scale || 1)

  const measureAndResize = useCallback(
    (text: string) => {
      if (!text) return

      const scale = textBox.scale || 1
      const fontSize = 14 * scale
      const padding = basePadding * scale

      const measureNode = new Konva.Text({
        text,
        fontSize,
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.4,
        width: textBox.width - padding * 2,
        wrap: 'word',
      })
      const measuredHeight = measureNode.height() + padding * 2
      measureNode.destroy()

      const defaultHeight = TEXT_BOX_HEIGHT * scale
      const newHeight = Math.max(defaultHeight, measuredHeight)

      if (Math.abs(newHeight - textBox.height) > 1) {
        onChange({ height: newHeight })
      }
    },
    [textBox.width, textBox.height, textBox.scale, onChange],
  )

  const handleDblClick = () => {
    draftRef.current = textBox.text
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
    if (value !== textBox.text) onChange({ text: value })
    measureAndResize(value)
  }

  const handleBlur = () => {
    commit()
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

  return (
    <Group
      ref={groupRef}
      x={textBox.x}
      y={textBox.y}
      width={textBox.width}
      height={textBox.height}
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
        height={textBox.height}
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
            style: { width: `${textBox.width}px`, height: `${textBox.height}px` },
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
              onChange({ text: value })
              measureAndResize(value)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full border-none bg-transparent resize-none outline-none font-sans text-sm text-[#333] p-2.5 leading-[1.4] placeholder:text-gray-400"
            style={{
              fontSize: `${14 * (textBox.scale || 1)}px`,
              padding: `${scaledPadding}px`,
            }}
          />
        </Html>
      ) : (
        <Text
          text={textBox.text || '텍스트를 입력하세요'}
          x={scaledPadding}
          y={scaledPadding}
          width={Math.max(1, textBox.width - scaledPadding * 2)}
          fontSize={14 * textBox.scale}
          fontFamily="Arial, sans-serif"
          fill={textBox.text ? '#333' : '#9CA3AF'}
          lineHeight={1.4}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}
    </Group>
  )
}
