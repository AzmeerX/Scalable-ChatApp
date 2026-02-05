import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext";
import { useCrypto } from "../context/CryptoContext.jsx";
import formatDay from "../helpers/formatDate.js";
import {
    encryptMessage,
    decryptMessage,
    validatePrivateKey,
    validatePublicKey,
    validatePublicKeyForRsa,
} from "../helpers/cryptoUtils.js";

export default function ChatArea({ conversation, onBack }) {
    const { user: currentUser } = useAuth();
    const { socket } = useSocket();
    const { keyPair } = useCrypto();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const [error, setError] = useState(null);
    const [recipientPublicKeys, setRecipientPublicKeys] = useState({});
    const [encryptionError, setEncryptionError] = useState(null);
    const [sendRetry, setSendRetry] = useState({ messageText: null, retryCount: 0 });

    const scrollRef = useRef(null);
    const typingTimeout = useRef(null);
    const TYPING_TIMEOUT = 2000;

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    /* Fetch Recipient Public Keys */
    const fetchRecipientPublicKeys = useCallback(async () => {
        if (!conversation?.participants) return;

        try {
            const keys = {};
            for (const participant of conversation.participants) {
                if (participant._id !== currentUser._id) {
                    try {
                        let response;
                        try {
                            response = await api.get(
                                `/api/v1/users/public-key/${participant._id}`
                            );
                        } catch (primaryErr) {
                            response = await api.get(
                                `/api/v1/users/${participant._id}/public-key`
                            );
                        }
                        const { data } = response;
                        const fetchedKey = data.data.publicKey;
                        if (!validatePublicKey(fetchedKey) || !(await validatePublicKeyForRsa(fetchedKey))) {
                            continue;
                        }
                        keys[participant._id] = fetchedKey;
                    } catch (err) {
                        // Skip if key fetch fails
                    }
                }
            }
            setRecipientPublicKeys(keys);
            return keys;
        } catch (err) {
            // Error already handled in loop
        }
        return null;
    }, [conversation?.participants, currentUser._id]);

    /* Fetch Messages + Recipient Keys */
    useEffect(() => {
        if (!conversation?._id) return;

        let cancelled = false;
        setLoading(true);

        const init = async () => {
            try {
                // Fetch recipient public keys first (fresh)
                const keys = await fetchRecipientPublicKeys();

                // Fetch messages
                const { data } = await api.get(
                    `/api/v1/messages/${conversation._id}`
                );

                let msgs = Array.isArray(data?.data)
                    ? [...data.data].reverse()
                    : [];

                // Decrypt messages if we have the private key
                if (
                    keyPair?.privateKey &&
                    validatePrivateKey(keyPair.privateKey)
                ) {
                    const decryptedMsgs = [];
                    for (const msg of msgs) {
                        try {
                            // Check if message is encrypted
                            if (
                                msg.encryptedText &&
                                msg.iv &&
                                msg.signature
                            ) {
                                const senderPublicKey = keys
                                    ? keys[msg.sender._id]
                                    : recipientPublicKeys[msg.sender._id];

                                if (!senderPublicKey) {
                                    console.warn(
                                        "No public key found for sender",
                                        msg.sender._id
                                    );
                                    decryptedMsgs.push(msg);
                                    continue;
                                }
                                if (!validatePublicKey(senderPublicKey)) {
                                    console.warn(
                                        "Invalid public key format for sender",
                                        msg.sender._id
                                    );
                                    decryptedMsgs.push(msg);
                                    continue;
                                }
                                if (
                                    !(await validatePublicKeyForRsa(
                                        senderPublicKey
                                    ))
                                ) {
                                    console.warn(
                                        "Unsupported public key algorithm for sender",
                                        msg.sender._id
                                    );
                                    decryptedMsgs.push(msg);
                                    continue;
                                }

                                const decryptedText = await decryptMessage(
                                    {
                                        encryptedText: msg.encryptedText,
                                        iv: msg.iv,
                                        signature: msg.signature,
                                    },
                                    senderPublicKey,
                                    keyPair.privateKey
                                );

                                decryptedMsgs.push({
                                    ...msg,
                                    text: decryptedText,
                                    isDecrypted: true,
                                });
                            } else {
                                decryptedMsgs.push(msg);
                            }
                        } catch (err) {
                            // Decryption failed
                            decryptedMsgs.push({
                                ...msg,
                                text: "[Decryption failed]",
                                isDecrypted: false,
                            });
                        }
                    }
                    msgs = decryptedMsgs;
                }

                if (!cancelled) {
                    setMessages(msgs);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    scrollToBottom();
                }
            }
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [conversation?._id, keyPair, fetchRecipientPublicKeys]);

    /* Join Conversation Room */
    useEffect(() => {
        if (!socket || !conversation?._id) return;
        socket.emit("join_conversation", [conversation._id]);
    }, [socket, conversation?._id]);

    /* Typing Indicator */
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

    /* Rate Limiting */
    useEffect(() => {
        if (!socket) return;

        const handleErrorMessage = ({ error }) => {
            setError(error);
            setTimeout(() => setError(null), 4000);

            // If server complains about recipient public key, refresh our cached keys
            if (
                typeof error === "string" &&
                error.toLowerCase().includes("public key")
            ) {
                fetchRecipientPublicKeys();
            }
        };

        socket.on("error_message", handleErrorMessage);
        return () => socket.off("error_message", handleErrorMessage);
    }, [socket, fetchRecipientPublicKeys]);

    /* New Messages */
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

    /* Delivery Status */
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

    /* Send Message */
    const handleSend = useCallback(
        async (textToSend = null, retryAttempt = 0) => {
            const textInput = textToSend || input.trim();
            if (!textInput || !conversation) return;

            if (!textToSend) {
                setInput(""); // Clear input on first send only
            }

            try {
                // Validate encryption setup
                if (!keyPair?.privateKey) {
                    setEncryptionError(
                        "⚠️ Encryption keys not loaded. Please refresh the page."
                    );
                    return;
                }

                // Get recipient's id (for 1-1 chat, or first recipient for group)
                const recipientId = conversation.participants.find(
                    (p) => p._id !== currentUser._id
                )?._id;

                if (!recipientId) {
                    setEncryptionError(
                        "❌ No recipient found in conversation."
                    );
                    return;
                }

                // Always try to fetch a fresh public key from the server right before sending
                let recipientPublicKey = null;
                try {
                    let response;
                    try {
                        response = await api.get(
                            `/api/v1/users/public-key/${recipientId}`
                        );
                    } catch (primaryErr) {
                        response = await api.get(
                            `/api/v1/users/${recipientId}/public-key`
                        );
                    }
                    recipientPublicKey = response?.data?.data?.publicKey;

                    // Cache it locally for UI use
                    if (recipientPublicKey) {
                        setRecipientPublicKeys((prev) => ({
                            ...prev,
                            [recipientId]: recipientPublicKey,
                        }));
                    }
                } catch (err) {
                    // Key fetch failed, will show error to user
                }

                if (!recipientPublicKey) {
                    setEncryptionError(
                        "Recipient hasn't set up encryption yet. Ask them to login first."
                    );
                    return;
                }

                if (!validatePublicKey(recipientPublicKey) || !(await validatePublicKeyForRsa(recipientPublicKey))) {
                    setEncryptionError(
                        "Recipient public key is invalid. Ask them to log in again to regenerate it."
                    );
                    return;
                }

                // Encrypt the message (now async with RSA)
                const encryptedPayload = await encryptMessage(
                    textInput,
                    recipientPublicKey,
                    keyPair.privateKey
                );

                // Use socket acknowledgement callback (if supported) to catch immediate server-side errors
                socket.emit(
                    "send_message",
                    {
                        conversationId: conversation._id,
                        text: textInput, // Send plaintext for display (encrypted separately)
                        ...encryptedPayload, // Include encryption payload
                    },
                    (ack) => {
                        if (ack && ack.error) {
                            const isKeyError =
                                typeof ack.error === "string" &&
                                (ack.error.toLowerCase().includes("public key") ||
                                    ack.error.toLowerCase().includes("not configured") ||
                                    ack.error.toLowerCase().includes("not found"));

                            if (isKeyError && retryAttempt < 2) {
                                fetchRecipientPublicKeys();
                                setTimeout(() => {
                                    handleSend(textInput, retryAttempt + 1);
                                }, 1500);
                            } else {
                                setEncryptionError(ack.error);
                                setSendRetry({ messageText: null, retryCount: 0 });
                            }
                        } else {
                            setEncryptionError(null);
                            setSendRetry({ messageText: null, retryCount: 0 });
                        }
                    }
                );

                socket.emit("typing_stop", {
                    conversationId: conversation._id,
                });
            } catch (err) {
                setEncryptionError(
                    err.message || "Failed to send encrypted message"
                );
                setSendRetry({ messageText: null, retryCount: 0 });
            }
        },
        [input, conversation, socket, keyPair, currentUser._id, fetchRecipientPublicKeys]
    );

    /* Input Change (Typing) */
    const handleInputChange = useCallback((e) => {
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
    }, [socket, conversation?._id, TYPING_TIMEOUT]);

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center text-blue-600 text-lg">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-[100dvh]">
            {/* Error Notification */}
            {(error || encryptionError) && (
                <div className="bg-red-500 text-white px-4 py-3 text-sm animate-slide-down">
                    ⚠️ {error || encryptionError}
                </div>
            )}

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


