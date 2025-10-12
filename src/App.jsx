import AuthProvider from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx"; 
import AppRouter from "./router.jsx"; 
import { RouterProvider } from "react-router-dom";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  );
}