import { XIcon, Phone, Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();
  const { typingUsers } = useChatStore();
  
  const isOnline = onlineUsers.includes(selectedUser?._id);
  const isTyping = typingUsers[selectedUser?._id] || false;

  const handleCall = async (type) => {
    if (!socket || !selectedUser) return;

    const callId = `${authUser._id}-${selectedUser._id}-${Date.now()}`;
    
    // Emit socket event for call
    socket.emit('initiate-call', {
      callId,
      receiverId: selectedUser._id,
      callerId: authUser._id,
      callerName: authUser.fullName,
      callerPic: authUser.profilePic,
      type
    });

    // Open call modal for caller
    window.dispatchEvent(new CustomEvent('openCall', {
      detail: {
        callId,
        remoteUser: selectedUser,
        callType: type,
        isIncoming: false
      }
    }));
  };

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  if (!selectedUser) return null;

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
          <p className="text-xs">
            {isTyping ? (
              <span className="text-cyan-400 animate-pulse">typing...</span>
            ) : (
              <span className="text-slate-400">{isOnline ? "Online" : "Offline"}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Voice Call Button */}
        <button
          onClick={() => handleCall('audio')}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Voice Call"
        >
          <Phone className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>

        {/* Video Call Button */}
        <button
          onClick={() => handleCall('video')}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Video Call"
        >
          <Video className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>

        {/* Close Button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <XIcon className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;