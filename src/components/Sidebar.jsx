import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axiosInstance.js";
import { useSocket } from "../context/SocketContext.jsx"; 

export default function Sidebar({ onSelectConversation, selectedConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();

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

  useEffect(() => {
    if (!socket) return;
    socket.on("new_message", (message) => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === message.conversationId) {
            return { ...conv, lastMessage: message };
          }
          return conv;
        });
      });
    });

    return () => socket.off("new_message");
  }, [socket]);

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      const { data } = await api.post("/api/v1/conversations/create-or-find", {
        username: search.trim(),
      });

      const conversation = {
        ...data.data,
        participants: data.data.participants
          ? data.data.participants
          : [data.data.user1, data.data.user2],
      };

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

      <input
        type="text"
        placeholder="Search username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        className="p-2 rounded bg-gray-100 w-full mb-2 focus:outline-none"
      />

      <div className="space-y-2">
        {conversations.length === 0 && (
          <div className="text-gray-500">No conversations yet.</div>
        )}

        {conversations.map((conv) => {
          const isActive = selectedConversation?._id?.toString() === conv._id?.toString();
          const otherUser = conv.participants?.filter(
            (p) => p._id !== currentUser._id
          )[0];

          return (
            <div
              key={conv._id}
              onClick={() => onSelectConversation(conv)}
              className={`p-3 rounded-lg cursor-pointer transition-all 
                ${isActive ? "bg-blue-100 font-medium" : "bg-gray-50 hover:bg-gray-100"}
              `}
            >
              <div className="font-semibold flex items-center gap-2">
                {otherUser?.username || "Unknown User"}
                {onlineUsers?.has?.(otherUser?._id?.toString()) && (
                  <div className="w-3 h-3 mt-1 rounded-full bg-green-500"></div>
                )}
              </div>

              {conv.lastMessage && (
                <div className="flex justify-between text-gray-500 text-sm mt-1">
                  <span className="truncate">
                    <span className="font-semibold">
                      {conv.lastMessage.sender?.username === currentUser.username
                        ? "You"
                        : conv.lastMessage.sender?.username}
                      :{" "}
                    </span>
                    {conv.lastMessage.text}
                  </span>

                  <span className="ml-2 text-xs text-gray-400 flex-shrink-0">
                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}