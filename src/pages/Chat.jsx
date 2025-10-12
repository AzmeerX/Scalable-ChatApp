import Sidebar from "../components/Sidebar.jsx";
import ChatArea from "../components/ChatArea.jsx";

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <ChatArea />
    </div>
  );
}