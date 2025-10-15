import { useEffect, useState, useRef } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext";
import formatDay from "../helpers/formatDate.js";

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

    let lastMessageDay = null;

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

            setTypingUsers(prev => {
                if (isTyping) {
                    return prev.includes(userId) ? prev : [...prev, userId];
                } else {
                    return prev.filter(id => id !== userId);
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
        if (!socket || !conversation) return;

        messages.forEach((msg) => {
            if (msg.sender._id !== currentUser._id && msg.status === "sent") {
                socket.emit("message_delivered", { messageId: msg._id });
            }
        });
    }, [messages, socket, conversation]);

    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = ({ messageId, status }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, status } : msg
                )
            );
        };

        socket.on("message_status", handleStatusUpdate);

        return () => socket.off("message_status", handleStatusUpdate);
    }, [socket]);

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

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!socket || !conversation?._id) return;

        if (!typingTimeout.current) {
            socket.emit("typing", { conversationId: conversation._id, isTyping: true });
        }

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit("typing", { conversationId: conversation._id, isTyping: false });
            typingTimeout.current = null;
        }, TYPING_TIMEOUT);
    };

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                    {conversation.participants
                        ?.filter((p) => p._id !== currentUser._id)
                        ?.map((p) => p.username)
                        ?.join(", ") || "Unknown User"}

                    {typingUsers.length > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-500 italic">
                            <span className="flex ml-40 space-x-1">
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
                    (() => {
                        let lastMessageDay = null;
                        return messages
                            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            .map((msg, i) => {
                                const msgDay = formatDay(msg.createdAt);
                                const showSeparator = msgDay !== lastMessageDay;
                                lastMessageDay = msgDay;

                                return (
                                    <div key={msg._id || i} className="flex flex-col">
                                        {showSeparator && (
                                            <div className="flex justify-center my-4">
                                                <span className="px-4.5 py-2 text-sm font-semibold bg-gray-300 text-gray-700 rounded-full shadow-sm tracking-wide">
                                                    {msgDay}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex ${msg.sender?._id === currentUser._id ? "justify-end" : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`relative px-4 py-2 rounded-2xl text-mg max-w-lg break-words ${msg.sender?._id === currentUser._id
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-300 text-black"
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

                                                {msg.sender?._id === currentUser._id && (
                                                    <span className="text-xs text-gray-200 ml-1">
                                                        {msg.status === "sent"
                                                            ? "✓"
                                                            : msg.status === "delivered"
                                                                ? "✓✓"
                                                                : "✓✓✔"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                    })()
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