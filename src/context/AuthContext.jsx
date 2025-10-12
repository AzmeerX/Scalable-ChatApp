import { createContext, useEffect, useState, useContext } from "react";
import api from "../api/axiosInstance.js";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/api/v1/users/me");
                setUser(data.data.user);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = async (credentials) => {
        const { data } = await api.post("/api/v1/users/login", credentials);
        setUser(data.data.user);
    }

    const logout = async () => {
        await api.post("/api/v1/users/logout");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}