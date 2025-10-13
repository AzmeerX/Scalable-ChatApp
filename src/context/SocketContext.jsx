import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(import.meta.env.VITE_API_BASE_URL, {
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to socket:", socketRef.current.id);
      setSocketReady(true);

      if (user.conversations?.length) {
        const convIds = user.conversations.map((c) => c.toString());
        socketRef.current.emit("join_conversation", convIds);
        console.log("Joined conversation rooms:", convIds);
      }
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      setSocketReady(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (msg) => {
      console.log("📩 New message received:", msg);
      // TODO: update UI/store, e.g., via context, Redux, or passing callbacks
    };

    socketRef.current.on("new_message", handleNewMessage);

    return () => {
      socketRef.current.off("new_message", handleNewMessage);
    };
  }, [socketReady]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);