import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="text-center mt-10 text-gray-400">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/signup" replace />;
}