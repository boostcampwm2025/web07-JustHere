import React, { useRef, useState, useEffect } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import type Konva from 'konva'
import type { PostIt } from '@/types/canvas.types'

interface EditablePostItProps {
  postit: PostIt
  draggable: boolean
  onDragEnd: (x: number, y: number) => void
  onChange: (updates: Partial<Omit<PostIt, 'id'>>) => void
}

function EditablePostIt({ postit, draggable, onDragEnd, onChange }: EditablePostItProps) {
  const [isEditing, setIsEditing] = useState(false)
  const isComposingRef = useRef(false)
  const draftRef = useRef(postit.text)

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
    draftRef.current = postit.text
    setIsEditing(true)
  }

  // 텍스트 변경 → 실시간 동기화
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    draftRef.current = e.target.value
    if (!isComposingRef.current) {
      onChange({ text: e.target.value })
    }
  }

  const commit = (nextText?: string) => {
    const value = nextText ?? draftRef.current
    if (value !== postit.text) onChange({ text: value })
  }

  // 편집 종료
  const handleBlur = () => {
    commit()
    setIsEditing(false)
  }

  // Enter 키 (Shift 없이) → 편집 종료
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      x={postit.x}
      y={postit.y}
      draggable={draggable && !isEditing} // 편집 중에는 드래그 불가
      onDragEnd={e => {
        onDragEnd(e.target.x(), e.target.y())
      }}
    >
      {/* 배경 사각형 */}
      <Rect width={postit.width} height={postit.height} fill={postit.fill} shadowBlur={5} cornerRadius={8} onDblClick={handleDblClick} />

      {/* 편집 모드: HTML textarea */}
      {isEditing ? (
        <Html
          transform
          divProps={{
            className: 'absolute top-0 left-0',
            style: {
              width: `${postit.width}px`,
              height: `${postit.height - 30}px`, // 하단 작성자 이름 공간 제외
            },
          }}
        >
          <textarea
            ref={textareaRef}
            defaultValue={postit.text}
            onChange={handleTextChange}
            onCompositionStart={() => (isComposingRef.current = true)}
            onCompositionEnd={e => {
              isComposingRef.current = false
              onChange({ text: (e.target as HTMLTextAreaElement).value })
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full border-none bg-transparent resize-none outline-none font-sans text-sm text-[#333] p-[10px] leading-[1.4]"
          />
        </Html>
      ) : (
        /* 일반 모드: Konva Text */
        <Text
          text={postit.text}
          x={10}
          y={10}
          width={postit.width - 20}
          height={postit.height - 40}
          fontSize={14}
          fontFamily="Arial, sans-serif"
          fill="#333"
          lineHeight={1.4}
          wrap="word"
          onDblClick={handleDblClick}
        />
      )}

      {/* 작성자 이름 (항상 표시) */}
      <Text text={postit.authorName} x={10} y={postit.height - 25} fontSize={10} fontFamily="Arial, sans-serif" fill="#888" />
    </Group>
  )
}

export default EditablePostIt
