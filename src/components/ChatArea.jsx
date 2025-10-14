import { useEffect, useState, useRef } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext";

export default function ChatArea({ conversation }) {
    const { user: currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const { socket } = useSocket();
    const scrollRef = useRef();
    const typingTimeout = useRef(null);
    const TYPING_TIMEOUT = 2000;

    useEffect(() => {
        if (!conversation?._id) return;
        setLoading(true);
        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/api/v1/messages/${conversation._id}`);
                const msgs = Array.isArray(data?.data) ? [...data.data].reverse() : [];
                setMessages(msgs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                scrollToBottom();
            }
        };
        fetchMessages();
    }, [conversation?._id]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (socket && conversation?._id) {
            socket.emit("join_conversation", [conversation._id]);
        }
    }, [socket, conversation?._id]);

    useEffect(() => {
        if (!socket || !conversation?._id) return;

        const handleTyping = ({ conversationId, userId, isTyping }) => {
            if (conversationId !== conversation._id || userId === currentUser._id) return;
            setTypingUsers((prev) => {
                if (isTyping) {
                    return prev.includes(userId.toString()) ? prev : [...prev, userId.toString()];
                } else {
                    return prev.filter((id) => id !== userId.toString());
                }
            });
        };

        socket.on("typing", handleTyping);
        return () => socket.off("typing", handleTyping);
    }, [socket, conversation?._id, currentUser._id]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMsg) => {
            if (newMsg.conversationId === conversation?._id) {
                setMessages((prev) => [...prev, newMsg]);
                scrollToBottom();
            }
        };

        socket.on("new_message", handleNewMessage);
        return () => socket.off("new_message", handleNewMessage);
    }, [socket, conversation?._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !conversation) return;
        const text = input.trim();
        setInput("");

        socket?.emit("send_message", { conversationId: conversation._id, text });
        socket?.emit("typing_stop", { conversationId: conversation._id });
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                    {conversation.participants
                        ?.filter((p) => p._id !== currentUser._id)
                        ?.map((p) => p.username)
                        ?.join(", ") || "Unknown User"}

                    {typingUsers.length > 0 && (
                        <span className="flex ml-45 items-center gap-1 text-sm text-gray-500 italic">
                            <span className="flex space-x-1">
                                <span className="w-3.5 h-3.5 bg-gray-500 rounded-full animate-bounceDelay1"></span>
                                <span className="w-3.5 h-3.5 bg-gray-500 rounded-full animate-bounceDelay2"></span>
                                <span className="w-3.5 h-3.5 bg-gray-500 rounded-full animate-bounceDelay3"></span>
                            </span>
                        </span>
                    )}
                </h2>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto flex flex-col space-y-2 bg-gray-50"
            >
                {loading ? (
                    <div className="text-gray-400">Loading messages...</div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={msg._id || i}
                            className={`relative px-4 py-2 rounded-2xl text-mg max-w-lg break-words ${msg.sender?._id === currentUser._id
                                ? "bg-blue-500 text-white self-end"
                                : "bg-gray-300 text-black self-start"
                                }`}
                        >
                            <div className="pr-12">{msg.text}</div>
                            <span className="absolute bottom-1 right-3 text-[10px] opacity-70">
                                {msg.createdAt &&
                                    new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white flex gap-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring focus:ring-blue-200"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        if (socket && conversation?._id) {
                            socket.emit("typing_start", { conversationId: conversation._id });
                            clearTimeout(typingTimeout.current);
                            typingTimeout.current = setTimeout(() => {
                                socket.emit("typing_stop", { conversationId: conversation._id });
                            }, TYPING_TIMEOUT);
                        }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                    onClick={handleSend}
                >
                    Send
                </button>
            </div>
        </div>

    );
}