import { useRef, useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import type Konva from 'konva'
import type { PostIt } from '@/shared/types'

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

  const handleDblClick = () => {
    draftRef.current = postIt.text
    onEditStart()
    setIsEditing(true)
  }

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

  const basePadding = 10
  const scaledPadding = basePadding * (postIt.scale || 1)

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
      <Rect width={postIt.width} height={postIt.height} fill={postIt.fill} shadowBlur={5} cornerRadius={8} onDblClick={handleDblClick} />

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
            style={{
              fontSize: `${14 * (postIt.scale || 1)}px`,
              padding: `${scaledPadding}px`,
            }}
          />
        </Html>
      ) : (
        <Text
          text={postIt.text}
          x={scaledPadding}
          y={scaledPadding}
          width={Math.max(50, postIt.width - scaledPadding * 2)}
          height={Math.max(50, postIt.height - scaledPadding * 2)}
          fontSize={14 * postIt.scale}
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
