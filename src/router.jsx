import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Register />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <Chat />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}