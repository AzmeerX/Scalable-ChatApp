import { createContext, useEffect, useState, useContext, useMemo, useCallback } from "react";
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

    const login = useCallback(async (credentials) => {
        const { data } = await api.post("/api/v1/users/login", credentials);
        setUser(data.data.user);
    }, []);

    const logout = useCallback(async () => {
        await api.post("/api/v1/users/logout");
        setUser(null);
    }, []);

    const contextValue = useMemo(() => ({
        user,
        login,
        logout,
        loading,
    }), [user, login, logout, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}