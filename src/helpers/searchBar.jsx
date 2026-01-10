import { useCallback } from "react";
import { useUserSearch } from "../hooks/useUserSearch";
import api from "../api/axiosInstance";

export default function SearchBar({ onSelectConversation, setConversations, conversations }) {
  const { search, setSearch, loading, results } = useUserSearch();

  const defaultProfile = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/v1763034660/149071_uc10n7.png`;

  const highlightMatch = useCallback((text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-gradient-to-r from-amber-300 to-yellow-300 font-bold text-gray-900 px-1 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  }, []);

  const handleUserClick = useCallback(async (username) => {
    try {
      const { data } = await api.post("/api/v1/conversations/create-or-find", { username });
      const conversation = data.data;

      const exists = conversations.find((c) => c._id === conversation._id);
      if (!exists) setConversations((prev) => [conversation, ...prev]);

      onSelectConversation(conversation);
      setSearch("");
    } catch (err) {
      console.error(err);
    }
  }, [conversations, onSelectConversation, setSearch, setConversations]);

  return (
    <div className="relative mb-4">
      <div className="relative">
        <svg
          className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2.5 pl-10 rounded-lg bg-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 ml-1">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
          <p>Searching...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="absolute bg-white w-full shadow-lg rounded-lg mt-2 z-10 max-h-56 overflow-y-auto border border-gray-200">
          {results.map((u, idx) => (
            <div
              key={u._id}
              onClick={() => handleUserClick(u.username)}
              className="p-3 flex items-center gap-3 hover:bg-amber-50 cursor-pointer transition-colors duration-200 border-b border-gray-100 last:border-b-0 group"
              style={{
                animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`
              }}
            >
              <img
                src={u.profile?.trim() || defaultProfile}
                alt={u.username}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-amber-300 transition-all"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{highlightMatch(u.username, search)}</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-amber-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}

          {!loading && search && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <svg
                className="w-8 h-8 mx-auto mb-2 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No users found
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}