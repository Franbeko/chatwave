import { XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const isOnline = onlineUsers.includes(selectedUser._id);

    useEffect(() => {

        const handleEscKey = (event) => {
            if (event.key === "Escape") setSelectedUser(null);
        } 

        window.addEventListener("keydown", handleEscKey)

        // cleanup function
        return () => window.removeEventListener("keydown", handleEscKey)
    },[setSelectedUser])

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-3 py-2">
      <div className="flex items-center space-x-2">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-8 h-8 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
          </div>
        </div>

        <div>
            <h3 className="text-slate-200 font-medium text-sm">{selectedUser.fullName}</h3>
            <p className="text-slate-400 text-xs">{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      <button 
        onClick={() => setSelectedUser(null)}
        className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
      >
        <XIcon className="w-4 h-4 text-slate-400 hover:text-slate-200" />
      </button>
    </div>
  )
}

export default ChatHeader;