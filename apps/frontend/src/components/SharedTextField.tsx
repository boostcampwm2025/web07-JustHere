import { useRef } from "react";
import { useYjsSync } from "@/hooks/useYjsSync";
import { useSharedText } from "@/hooks/useSharedText";

interface SharedTextFieldProps {
  roomName: string;
  fieldName?: string;
  label?: string;
}

export function SharedTextField({
  roomName,
  fieldName = "shared-text",
  label = "공유 텍스트",
}: SharedTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Y.js 연결
  const { doc, isConnected, isSynced } = useYjsSync({
    serverUrl: "ws://localhost:3000/yjs",
    roomName,
  });

  // 공유 텍스트 사용
  const { text, updateText } = useSharedText(doc, fieldName);

  // 커서 위치를 보존하면서 텍스트 업데이트
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursorPosition = e.target.selectionStart;
    const newValue = e.target.value;

    updateText(newValue);

    // 커서 위치 복원
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  };

  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      {/* 연결 상태 표시 */}
      <div style={{ marginBottom: 10, fontSize: 14 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isConnected ? "#4CAF50" : "#f44336",
            marginRight: 6,
          }}
        />
        {isConnected ? "연결됨" : "연결 중..."}
        {isSynced && " (동기화 완료)"}
      </div>

      {/* 공유 텍스트 필드 */}
      <div>
        <label
          style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
        >
          {label} (Field: {fieldName})
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          placeholder="여기에 입력하면 실시간으로 동기화됩니다..."
          style={{
            width: "100%",
            minHeight: 120,
            padding: 12,
            fontSize: 14,
            border: "2px solid #ddd",
            borderRadius: 8,
            resize: "vertical",
            fontFamily: "monospace",
          }}
        />
      </div>

      {/* 현재 값 표시 */}
      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <strong>글자 수:</strong> {text.length}
      </div>
    </div>
  );
}
