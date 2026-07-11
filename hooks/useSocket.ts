import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { socketURL as SOCKET_URL } from "utils/apiConfig";
import useAuthStore from "../store/useUserStore";

let globalSocket: Socket | null = null;
let globalRefCount = 0;
let globalAccessToken = "";

const getSocket = (accessToken: string): Socket => {
  if (globalSocket && globalSocket.connected && globalAccessToken === accessToken) {
    return globalSocket;
  }
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  globalAccessToken = accessToken;
  globalSocket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });
  return globalSocket;
};

export function useSocket(
  onEvent?: (socket: Socket) => void,
  deps: any[] = [],
) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    socketRef.current = socket;
    globalRefCount++;
    onEvent?.(socket);

    return () => {
      globalRefCount--;
      if (globalRefCount <= 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        globalAccessToken = "";
        globalRefCount = 0;
      }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ...deps]);

  return socketRef;
}

export function getSharedSocket(accessToken: string): Socket | null {
  if (!accessToken) return null;
  return getSocket(accessToken);
}
