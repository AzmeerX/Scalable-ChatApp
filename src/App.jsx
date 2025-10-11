import AuthProvider from "./context/authContext.jsx";
import AppRouter from "./router";

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}