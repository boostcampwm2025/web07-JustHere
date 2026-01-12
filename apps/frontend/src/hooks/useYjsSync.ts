import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface UseYjsSyncOptions {
  serverUrl: string;
  roomName: string;
}

export function useYjsSync({ serverUrl, roomName }: UseYjsSyncOptions) {
  // 1. doc과 provider를 useState의 초기화 함수에서 바로 생성합니다.
  // 이 함수들은 컴포넌트가 처음 마운트될 때 딱 한 번만 실행됩니다.
  const [doc] = useState(() => new Y.Doc());
  const [provider] = useState(
    () => new WebsocketProvider(serverUrl, roomName, doc),
  );

  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    // 2. 이벤트 리스너 등록
    const handleStatus = (event: { status: string }) => {
      setIsConnected(event.status === "connected");
    };
    const handleSync = (synced: boolean) => {
      setIsSynced(synced);
    };

    provider.on("status", handleStatus);
    provider.on("sync", handleSync);

    // 3. 클린업: 의존성이 변경되거나 언마운트될 때 실행
    return () => {
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);

      provider.destroy();
      doc.destroy();
    };
  }, [provider, doc]);

  return {
    doc,
    provider,
    isConnected,
    isSynced,
  };
}
