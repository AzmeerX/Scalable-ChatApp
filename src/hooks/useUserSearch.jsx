import { useState, useEffect } from "react";
import api from "../api/axiosInstance.js";

export function useUserSearch() {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (!search.trim()) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/api/v1/users/search?query=${search}`); 
                setResults(data?.data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }, 800);
        return () => clearTimeout(timeout);
    }, [search]);

    return { search, setSearch, loading, results };
}