export default function Sidebar() {
  return (
    <div className="w-1/4 bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Chats</h2>
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
          Placeholder Chat 1
        </div>
        <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
          Placeholder Chat 2
        </div>
      </div>
    </div>
  );
}