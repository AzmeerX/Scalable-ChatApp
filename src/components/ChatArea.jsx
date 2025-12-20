import { useEffect, useState, useRef } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext";
import formatDay from "../helpers/formatDate.js";

export default function ChatArea({ conversation, onBack }) {
    const { user: currentUser } = useAuth();
    const { socket } = useSocket();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);

    const scrollRef = useRef(null);
    const typingTimeout = useRef(null);
    const TYPING_TIMEOUT = 2000;

    /* =======================
       Fetch Messages
    ======================= */
    useEffect(() => {
        if (!conversation?._id) return;

        setLoading(true);

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(
                    `/api/v1/messages/${conversation._id}`
                );
                const msgs = Array.isArray(data?.data)
                    ? [...data.data].reverse()
                    : [];
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

    /* =======================
       Join Conversation Room
    ======================= */
    useEffect(() => {
        if (!socket || !conversation?._id) return;
        socket.emit("join_conversation", [conversation._id]);
    }, [socket, conversation?._id]);

    /* =======================
       Typing Indicator
    ======================= */
    useEffect(() => {
        if (!socket || !conversation?._id) return;

        const handleTyping = ({ conversationId, userId, isTyping }) => {
            if (conversationId !== conversation._id) return;
            if (userId === currentUser._id) return;

            setTypingUsers((prev) => {
                if (isTyping) {
                    return prev.includes(userId) ? prev : [...prev, userId];
                } else {
                    return prev.filter((id) => id !== userId);
                }
            });
        };

        socket.on("typing", handleTyping);

        return () => {
            socket.off("typing", handleTyping);
        };
    }, [socket, conversation?._id, currentUser._id]);

    /* =======================
       New Messages
    ======================= */
    useEffect(() => {
        if (!socket || !conversation?._id) return;

        const handleNewMessage = (newMsg) => {
            if (newMsg.conversationId === conversation._id) {
                setMessages((prev) => [...prev, newMsg]);
                scrollToBottom();
            }
        };

        socket.on("new_message", handleNewMessage);
        return () => socket.off("new_message", handleNewMessage);
    }, [socket, conversation?._id]);

    /* =======================
       Delivery Status
    ======================= */
    useEffect(() => {
        if (!socket || !conversation) return;

        messages.forEach((msg) => {
            if (
                msg.sender._id !== currentUser._id &&
                msg.status === "sent"
            ) {
                socket.emit("message_delivered", { messageId: msg._id });
            }
        });
    }, [messages, socket, conversation, currentUser._id]);

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

    /* =======================
       Send Message
    ======================= */
    const handleSend = () => {
        if (!input.trim() || !conversation) return;

        const text = input.trim();
        setInput("");

        socket.emit("send_message", {
            conversationId: conversation._id,
            text,
        });

        socket.emit("typing_stop", {
            conversationId: conversation._id,
        });
    };

    /* =======================
       Input Change (Typing)
    ======================= */
    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!socket || !conversation?._id) return;

        if (!typingTimeout.current) {
            socket.emit("typing_start", {
                conversationId: conversation._id,
            });
        }

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit("typing_stop", {
                conversationId: conversation._id,
            });
            typingTimeout.current = null;
        }, TYPING_TIMEOUT);
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center text-blue-600 text-lg">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-[100dvh]">
            {/* Header */}
            <div className="relative p-4 border-b bg-white flex flex-col items-center gap-1">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute left-3 top-3 sm:hidden"
                    >
                        ← Back
                    </button>
                )}

                <h2 className="font-semibold truncate">
                    {conversation.participants
                        ?.filter((p) => p._id !== currentUser._id)
                        ?.map((p) => p.username)
                        ?.join(", ") || "Unknown User"}
                </h2>

                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounceDelay1" />
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounceDelay2" />
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounceDelay3" />
                        <span className="text-xs text-gray-500 italic">
                            typing...
                        </span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-2"
            >
                {loading ? (
                    <div className="text-gray-400">Loading messages...</div>
                ) : (
                    (() => {
                        let lastMessageDay = null;

                        return messages
                            .sort(
                                (a, b) =>
                                    new Date(a.createdAt) -
                                    new Date(b.createdAt)
                            )
                            .map((msg, i) => {
                                const msgDay = formatDay(msg.createdAt);
                                const showSeparator =
                                    msgDay !== lastMessageDay;
                                lastMessageDay = msgDay;

                                return (
                                    <div key={msg._id || i}>
                                        {showSeparator && (
                                            <div className="flex justify-center my-3">
                                                <span className="px-3 py-1 text-xs bg-gray-300 rounded-full">
                                                    {msgDay}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            className={`flex ${msg.sender._id ===
                                                currentUser._id
                                                ? "justify-end"
                                                : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`px-4 py-2 rounded-2xl break-words text-sm relative ${msg.sender._id ===
                                                    currentUser._id
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-300 text-black"
                                                    }`}
                                            >
                                                <div className="pr-10">
                                                    {msg.text}
                                                </div>

                                                <span className="absolute bottom-1 right-2 text-[10px] opacity-70">
                                                    {new Date(
                                                        msg.createdAt
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>

                                                {msg.sender._id ===
                                                    currentUser._id && (
                                                        <span className="ml-1 text-[10px]">
                                                            {msg.status === "sent"
                                                                ? "✓"
                                                                : msg.status ===
                                                                    "delivered"
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

            {/* Input */}
            <div className="p-4 border-t bg-white flex gap-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-3 py-2 outline-none"
                    value={input}
                    onChange={handleInputChange}
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