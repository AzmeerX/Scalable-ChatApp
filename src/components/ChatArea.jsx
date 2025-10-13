import { useEffect, useState, useRef } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext";

export default function ChatArea({ conversation }) {
    const { user: currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const socket = useSocket();
    const scrollRef = useRef();

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

    const handleSend = async () => {
        if (!input.trim() || !conversation) return;
        const msg = { text: input };
        setMessages((prev) => [...prev, { ...msg, temp: true }]);
        setInput("");

        try {
            socket?.emit("private_message", { conversationId: conversation._id, text: msg.text }, (savedMsg) => {
                setMessages((prev) => prev.map((m) => (m.temp ? savedMsg : m)));
                scrollToBottom();
            });
        } catch (err) {
            console.error(err);
        }
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
            <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="font-semibold">
                    {conversation.participants
                        ?.filter(p => p._id !== currentUser._id)
                        ?.map(p => p.username)
                        ?.join(", ") || "Unknown User"}
                </h2>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-50"
            >
                {loading ? (
                    <div className="text-gray-400">Loading messages...</div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={msg._id || i}
                            className={`p-2 rounded-lg ${msg.sender === "me" ? "bg-blue-500 text-white self-end" : "bg-white"
                                }`}
                        >
                            {msg.text}
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
                    onChange={(e) => setInput(e.target.value)}
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