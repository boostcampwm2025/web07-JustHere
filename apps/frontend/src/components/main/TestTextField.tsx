import { SharedTextField } from "@/components/SharedTextField";

function TestTextField() {
  return (
    <div style={{ padding: "20px" }}>
      <h2
        style={{
          marginBottom: "16px",
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        실시간 협업 텍스트 필드 (CRDT 기반)
      </h2>
      <p style={{ marginBottom: "20px", color: "#666", fontSize: "14px" }}>
        각 텍스트 필드는 독립적으로 동기화됩니다. 여러 브라우저 탭에서 동시에
        수정해보세요!
      </p>

      <SharedTextField
        roomName="test-room"
        fieldName="text-field-1"
        label="텍스트 필드 #1"
      />

      <SharedTextField
        roomName="test-room"
        fieldName="text-field-2"
        label="텍스트 필드 #2"
      />

      <SharedTextField
        roomName="test-room"
        fieldName="text-field-3"
        label="텍스트 필드 #3"
      />
    </div>
  );
}

export default TestTextField;
