import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

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

      socketRef.current.emit("get_online_users");
    });

    socketRef.current.on("disconnect", () => {
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
      setMessages((prev) => [...prev, msg]);
    };

    const handleOnlineUsers = (data) => {
      const userList = Array.isArray(data?.users) ? data.users : [];
      const onlineUserIds = new Set(userList.map(userId => userId.toString()));
      setOnlineUsers(onlineUserIds);
    };

    socketRef.current.on("new_message", handleNewMessage);
    socketRef.current.on("online_users", handleOnlineUsers);

    return () => {
      socketRef.current.off("new_message", handleNewMessage);
      socketRef.current.off("online_users", handleOnlineUsers);
    };
  }, [socketReady]);

  const sendMessage = useCallback((conversationId, text, media = null) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send_message", { conversationId, text, media });
  }, []);

  const contextValue = useMemo(() => ({
    socket: socketRef.current,
    messages,
    sendMessage,
    onlineUsers,
  }), [messages, sendMessage, onlineUsers]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);