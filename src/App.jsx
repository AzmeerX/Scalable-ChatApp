import AuthProvider from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { CryptoProvider } from "./context/CryptoContext.jsx";
import AppRouter from "./router.jsx";
import { useAutoUploadPublicKey } from "./hooks/useAutoUploadPublicKey.js";

function AppContent() {
  useAutoUploadPublicKey();
  return <AppRouter />;
}

export default function App() {
  return (
    <AuthProvider>
      <CryptoProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </CryptoProvider>
    </AuthProvider>
  );
}