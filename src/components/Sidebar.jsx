import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import GroupButton from "../group-chat/GroupButton.jsx";
import api from "../api/axiosInstance.js";
import SearchBar from "../helpers/searchBar.jsx";

export default function Sidebar({ onSelectConversation, selectedConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
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

    const handleNewMessage = (message) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === message.conversationId ? { ...conv, lastMessage: message } : conv
        )
      );
    };

    socket.on("new_message", handleNewMessage);
    return () => socket.off("new_message", handleNewMessage);
  }, [socket]);

  if (loading) {
    return (
      <div className="w-1/4 p-4 bg-white border-r border-gray-200">
        Loading conversations...
      </div>
    );
  }

  return (
    <div className="w-1/4 bg-white border-r border-gray-200 p-4 flex flex-col">
      <h2 className="text-xl text-center font-semibold mb-4">Chats</h2>

      <SearchBar
        onSelectConversation={onSelectConversation}
        setConversations={setConversations}
        conversations={conversations}
      />

      <GroupButton
        onGroupCreated={(group) =>
          setConversations((prev) => [group, ...prev])
        }
      />

      <div className="flex-1 mt-2 space-y-2 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="text-gray-500 text-center mt-4">No conversations yet.</div>
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
              className={`flex items-center p-3 gap-3 cursor-pointer rounded-lg transition-all
                ${isActive ? "bg-blue-100 font-medium" : "bg-gray-50 hover:bg-gray-100"}`}
            >
              <img
                src={
                  otherUser?.profile ||
                  `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/v1763034660/149071_uc10n7.png`
                }
                alt={otherUser?.username}
                className="w-10 h-10 rounded-full object-cover"
              />

              <div className="flex-1 text-lg flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold">
                    {otherUser.username}
                  </span>
                  {onlineUsers?.has?.(otherUser?._id?.toString()) && (
                    <div className="w-3 h-3 rounded-full bg-green-500 ml-2 flex-shrink-0"></div>
                  )}
                </div>
                {conv.lastMessage ? (
                  <div className="text-gray-500 text-md truncate mt-0.5">
                    <span className="font-semibold">
                      {conv.lastMessage.sender?._id === currentUser._id
                        ? "You"
                        : conv.lastMessage.sender?.username}
                      :
                    </span>{" "}
                    {conv.lastMessage.text}
                  </div>
                ) : (
                  <div className="text-gray-400 text-md mt-0.5">No messages yet</div>
                )}
              </div>

              {conv.lastMessage && (
                <span className="ml-2 text-md text-gray-400 flex-shrink-0">
                  {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}