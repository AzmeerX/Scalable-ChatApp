import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import ChatArea from "../components/ChatArea.jsx";

export default function ChatPage() {
    const [selectedConversation, setSelectedConversation] = useState(null);

    return (
        <div className="flex h-[100dvh] bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <div
                className={`w-full sm:w-80 ${
                    selectedConversation ? "hidden sm:block" : "block"
                }`}
            >
                <Sidebar
                    onSelectConversation={setSelectedConversation}
                    selectedConversation={selectedConversation}
                />
            </div>

            {/* Chat Area */}
            <div
                className={`flex-1 ${
                    selectedConversation ? "block" : "hidden sm:block"
                }`}
            >
                <ChatArea
                    conversation={selectedConversation}
                    onBack={() => setSelectedConversation(null)}
                />
            </div>
        </div>
    );
}