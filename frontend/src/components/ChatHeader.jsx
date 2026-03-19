import { XIcon, Phone, Video, PhoneMissed } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();
  const { typingUsers } = useChatStore();
  const [callStatus, setCallStatus] = useState(null);
  
  const isOnline = onlineUsers.includes(selectedUser?._id);
  const isTyping = typingUsers[selectedUser?._id] || false;

  const handleCall = async (type) => {
    if (!socket || !selectedUser) {
      console.log("Cannot initiate call: socket or user missing");
      return;
    }

    if (!isOnline) {
      console.log("User is offline, cannot call");
      // Show toast that user is offline
      return;
    }

    const callId = `${authUser._id}-${selectedUser._id}-${Date.now()}`;
    
    console.log(`Initiating ${type} call to ${selectedUser.fullName}`);
    
    // Emit socket event for call
    socket.emit('initiate-call', {
      callId,
      receiverId: selectedUser._id,
      callerId: authUser._id,
      callerName: authUser.fullName,
      callerPic: authUser.profilePic,
      type
    });

    setCallStatus({ type, callId, status: 'calling' });

    // Open call modal for caller
    window.dispatchEvent(new CustomEvent('openCall', {
      detail: {
        callId,
        remoteUser: selectedUser,
        callType: type,
        isIncoming: false
      }
    }));

    // Set timeout for unanswered call
    setTimeout(() => {
      if (callStatus?.status === 'calling') {
        socket.emit('missed-call', {
          callId,
          callerId: authUser._id,
          receiverId: selectedUser._id,
          type
        });
        setCallStatus(null);
      }
    }, 30000); // 30 seconds timeout
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
        {/* Voice Call Button - disabled if offline */}
        <button
          onClick={() => handleCall('audio')}
          disabled={!isOnline}
          className={`p-2 rounded-lg transition-colors ${
            isOnline 
              ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200' 
              : 'opacity-50 cursor-not-allowed text-slate-600'
          }`}
          title={isOnline ? "Voice Call" : "User is offline"}
        >
          <Phone className="w-4 h-4" />
        </button>

        {/* Video Call Button - disabled if offline */}
        <button
          onClick={() => handleCall('video')}
          disabled={!isOnline}
          className={`p-2 rounded-lg transition-colors ${
            isOnline 
              ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200' 
              : 'opacity-50 cursor-not-allowed text-slate-600'
          }`}
          title={isOnline ? "Video Call" : "User is offline"}
        >
          <Video className="w-4 h-4" />
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