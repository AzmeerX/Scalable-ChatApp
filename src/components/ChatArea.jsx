export default function ChatArea() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="font-semibold">Selected Chat</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">Messages will appear here.</div>
      <div className="p-4 border-t border-gray-200 bg-white flex">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring focus:ring-blue-200"
        />
        <button className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}