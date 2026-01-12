import { useEffect, useState, useCallback, useMemo } from "react";
import * as Y from "yjs";

/**
 * 두 문자열 간의 diff를 계산하여 CRDT 작업으로 변환
 */
function calculateDiff(oldText: string, newText: string) {
  const operations: Array<{
    type: "delete" | "insert";
    index: number;
    length?: number;
    text?: string;
  }> = [];

  let i = 0;

  // 앞에서부터 같은 부분 찾기
  while (
    i < oldText.length &&
    i < newText.length &&
    oldText[i] === newText[i]
  ) {
    i++;
  }

  // 뒤에서부터 같은 부분 찾기
  let oldEnd = oldText.length;
  let newEnd = newText.length;

  while (
    oldEnd > i &&
    newEnd > i &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  // 삭제할 문자가 있으면
  const deleteCount = oldEnd - i;
  if (deleteCount > 0) {
    operations.push({ type: "delete", index: i, length: deleteCount });
  }

  // 삽입할 문자가 있으면
  const insertText = newText.substring(i, newEnd);
  if (insertText.length > 0) {
    operations.push({ type: "insert", index: i, text: insertText });
  }

  return operations;
}

export function useSharedText(doc: Y.Doc | null, name: string) {
  // 1. yText를 상태(state)가 아닌 useMemo로 파생시킵니다.
  // doc이나 name이 변경될 때만 새로 가져옵니다.
  const yText = useMemo(() => {
    if (!doc) return null;
    return doc.getText(name);
  }, [doc, name]);

  // 2. 핵심 해결책: useState의 초기값 함수(Lazy Initializer)를 사용합니다.
  // 이렇게 하면 렌더링 "도중"에 초기값이 결정되므로 useEffect에서 setText를 할 필요가 없습니다.
  // doc이나 name이 바뀌면 useSharedText 훅이 새로 호출되면서 이 초기값도 다시 계산됩니다.
  const [text, setText] = useState(() => (yText ? yText.toString() : ""));

  const [isLocalChange, setIsLocalChange] = useState(false);

  // 3. yText가 변경되었을 때(예: 다른 문서로 전환) text 상태를 강제로 동기화해야 한다면,
  // Effect 내부가 아니라 렌더링 로직 단계에서 처리하거나(추천되지 않음),
  // key를 사용하여 컴포넌트를 초기화하는 것이 정석입니다.
  // 일단 에러를 방지하기 위해 Effect에서는 '관찰(Observe)'만 담당하게 합니다.
  useEffect(() => {
    if (!yText) return;

    const observer = () => {
      if (!isLocalChange) {
        setText(yText.toString());
      }
    };

    yText.observe(observer);

    // 만약 yText가 바뀌었을 때 즉시 반영이 필요하다면
    // 아래처럼 "마운트 시점에만" 실행되는 조건 등을 활용할 수 있지만,
    // 사실 초기값 설정(위 2번)에서 이미 해결되었으므로 중복 호출할 필요가 없습니다.

    return () => {
      yText.unobserve(observer);
    };
  }, [yText, isLocalChange]);

  const updateText = useCallback(
    (newValue: string) => {
      if (!yText || !doc) return;

      const currentText = yText.toString();
      if (newValue === currentText) return;

      const operations = calculateDiff(currentText, newValue);

      setIsLocalChange(true);
      doc.transact(() => {
        operations.forEach((op) => {
          if (op.type === "delete" && op.length) {
            yText.delete(op.index, op.length);
          } else if (op.type === "insert" && op.text) {
            yText.insert(op.index, op.text);
          }
        });
      });
      setIsLocalChange(false);

      setText(newValue);
    },
    [yText, doc], // 이제 yText는 useMemo에 의해 관리됩니다.
  );

  return { text, updateText };
}
