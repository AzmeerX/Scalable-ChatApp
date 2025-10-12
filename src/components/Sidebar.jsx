import { useEffect, useState } from "react";
import api from "../api/axiosInstance.js";

export default function Sidebar({ onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get("/api/v1/conversations/get-conversations");
        setConversations(data.data);
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      const { data } = await api.post("/api/v1/conversations/create-or-find", {
        username: search.trim(),
      });

      const conversation = data.data; 

      if (!conversations.find((c) => c._id === conversation._id)) {
        setConversations((prev) => [conversation, ...prev]);
      }

      onSelectConversation(conversation);
      setSearch("");
    } catch (err) {
      console.error(err);
      alert("User not found or cannot create conversation");
    }
  };


  if (loading) {
    return (
      <div className="w-1/4 p-4 bg-white border-r border-gray-200">
        Loading conversations...
      </div>
    );
  }

  return (
    <div className="w-1/4 bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Chats</h2>
      <div className="space-y-2">
        {conversations.length === 0 && (
          <div className="text-gray-500">No conversations yet.</div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv._id}
            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelectConversation(conv)}
          >
            {conv.name || conv.participants?.map(p => p.name).join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}