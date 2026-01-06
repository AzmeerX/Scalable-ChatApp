import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
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
                    conv._id === message.conversationId
                        ? { ...conv, lastMessage: message }
                        : conv
                )
            );
        };

        socket.on("new_message", handleNewMessage);
        return () => socket.off("new_message", handleNewMessage);
    }, [socket]);

    if (loading) {
        return (
            <div className="w-full sm:w-80 p-4 bg-white border-r border-gray-200">
                Loading conversations...
            </div>
        );
    }

    return (
        <div className="w-full sm:w-80 bg-white border-r border-gray-200 
                        flex flex-col h-[100dvh]">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-center">
                    Chats
                </h2>
            </div>

            {/* Search */}
            <div className="px-3 sm:px-4 pt-2">
                <SearchBar
                    onSelectConversation={onSelectConversation}
                    setConversations={setConversations}
                    conversations={conversations}
                />
            </div>

            {/* Conversations */}
            <div className="flex-1 mt-2 px-2 sm:px-3 space-y-1 overflow-y-auto">
                {conversations.length === 0 && (
                    <div className="text-gray-500 text-center mt-6 text-sm">
                        No conversations yet.
                    </div>
                )}

                {conversations.map((conv) => {
                    const isActive =
                        selectedConversation?._id?.toString() ===
                        conv._id?.toString();

                    const otherUser = conv.participants?.find(
                        (p) => p._id.toString() !== currentUser._id.toString()
                    );

                    console.log("otherUser", otherUser);

                    const isOnline = onlineUsers?.has?.(
                        otherUser?._id?.toString()
                    );

                    console.log("onlineUsers", Array.from(onlineUsers), "checking for", otherUser?._id?.toString());
                    console.log("isOnline", isOnline);

                    return (
                        <div
                            key={conv._id}
                            onClick={() => onSelectConversation(conv)}
                            className={`flex items-center gap-3 cursor-pointer 
                                rounded-lg p-2 sm:p-3 transition-all
                                ${
                                    isActive
                                        ? "bg-blue-100"
                                        : "bg-gray-50 hover:bg-gray-100"
                                }`}
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <img
                                    src={
                                        otherUser?.profile ||
                                        `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/v1763034660/149071_uc10n7.png`
                                    }
                                    alt={otherUser?.username}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                                />
                                {isOnline && (
                                    <span className="absolute bottom-0 right-0 
                                                     w-3.5 h-3.5 bg-green-500 
                                                     border-2 border-white rounded-full" />
                                )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="truncate font-semibold text-sm sm:text-base">
                                        {otherUser?.username}
                                    </span>
                                </div>

                                {conv.lastMessage ? (
                                    <div className="text-gray-500 text-xs sm:text-sm truncate">
                                        <span className="font-semibold">
                                            {conv.lastMessage.sender?._id ===
                                            currentUser._id
                                                ? "You"
                                                : conv.lastMessage.sender?.username}
                                            :
                                        </span>{" "}
                                        {conv.lastMessage.text}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-xs sm:text-sm">
                                        No messages yet
                                    </div>
                                )}
                            </div>

                            {/* Time */}
                            {conv.lastMessage && (
                                <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
                                    {new Date(
                                        conv.lastMessage.createdAt
                                    ).toLocaleTimeString([], {
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