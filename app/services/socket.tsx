import { io, Socket } from "socket.io-client";
import { BASE_URL } from "./api/baseurl";

const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, "");

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export const connectSocket = (token: string) => {
  if (!token) return;

  const currentToken = typeof socket.auth === "object" ? socket.auth?.token : undefined;

  if (socket.connected && currentToken && currentToken !== token) {
    socket.disconnect();
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const emitTyping = (recipientId: string, conversationId?: string) => {
  socket.emit("typing", { recipientId, conversationId });
};

export const emitStopTyping = (recipientId: string, conversationId?: string) => {
  socket.emit("stopTyping", { recipientId, conversationId });
};

export const sendSocketMessage = (
  recipient: string,
  content: string,
  callback?: (response: { ok: boolean; message?: any }) => void
) => {
  socket.emit("sendMessage", { recipient, content }, callback);
};

export const sendSocketMessageAsync = (
  recipient: string,
  content: string
): Promise<{ ok: boolean; message?: any }> => {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, message: "Socket is not connected" });
      return;
    }

    socket.timeout(2500).emit("sendMessage", { recipient, content }, (error: Error | null, response: any) => {
      if (error) {
        resolve({ ok: false, message: error.message || "Socket message timeout" });
        return;
      }

      resolve(response || { ok: false, message: "No socket response" });
    });
  });
};

export default socket;
