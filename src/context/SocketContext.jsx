import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [onlineUserIds, setOnlineUserIds] = useState([]);

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

      // Request initial online users list when connected
      socketRef.current.emit("get_online_users");
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
      console.log("New message received:", msg);
      setMessages((prev) => [...prev, msg]);
    };

    socketRef.current.on("new_message", handleNewMessage);

    return () => {
      socketRef.current.off("new_message", handleNewMessage);
    };
  }, [socketReady]);

  // Presence: track online users and live updates
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    const setInitialOnline = (ids) => {
      if (Array.isArray(ids)) {
        setOnlineUserIds(ids.filter(Boolean));
      }
    };

    const handleUserConnected = (payload) => {
      const id = typeof payload === "string" ? payload : payload?.userId;
      if (!id) return;
      setOnlineUserIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const handleUserDisconnected = (payload) => {
      const id = typeof payload === "string" ? payload : payload?.userId;
      if (!id) return;
      setOnlineUserIds((prev) => prev.filter((uid) => uid !== id));
    };

    // Support a few common event names
    socket.on("online_users", setInitialOnline);
    socket.on("user_connected", handleUserConnected);
    socket.on("user_disconnected", handleUserDisconnected);
    socket.on("user_online", handleUserConnected);
    socket.on("user_offline", handleUserDisconnected);

    return () => {
      socket.off("online_users", setInitialOnline);
      socket.off("user_connected", handleUserConnected);
      socket.off("user_disconnected", handleUserDisconnected);
      socket.off("user_online", handleUserConnected);
      socket.off("user_offline", handleUserDisconnected);
    };
  }, [socketReady]);

  const sendMessage = (conversationId, text, media = null) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send_message", { conversationId, text, media });
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        messages,
        sendMessage,
        onlineUserIds,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);