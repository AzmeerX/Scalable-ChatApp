import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import ChatArea from "../components/ChatArea.jsx";

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSelectConversation={setSelectedConversation} />
      <ChatArea conversation={selectedConversation} />
    </div>
  );
}