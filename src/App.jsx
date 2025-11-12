import AuthProvider from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx"; 
import AppRouter from "./router.jsx"; 

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  );
}