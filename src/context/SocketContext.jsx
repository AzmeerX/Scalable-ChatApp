import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      socketRef.current = io(import.meta.env.VITE_API_BASE_URL, {
        withCredentials: true,
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket:", socketRef.current.id);
      });

      socketRef.current.on("disconnect", (reason) => {
        console.log("Disconnected:", reason);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);