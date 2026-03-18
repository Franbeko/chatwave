import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";
import { Users } from "lucide-react";

function ChatsList() {
  const { 
    getMyChatPartners, 
    chats, 
    isUsersLoading, 
    setSelectedUser,
    getUserGroups,
    groups,
    setSelectedGroup,
    isGroupsLoading
  } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
    getUserGroups();
  }, [getMyChatPartners, getUserGroups]);

  if (isUsersLoading || isGroupsLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0 && groups.length === 0) return <NoChatsFound />;

  return (
    <div className="space-y-1">
      {/* Groups Section */}
      {groups.length > 0 && (
        <>
          <div className="px-2 py-1">
            <p className="text-xs text-slate-400 font-medium">GROUPS</p>
          </div>
          {groups.map((group) => (
            <div
              key={group._id}
              className="bg-cyan-500/10 p-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-center gap-2">
                <div className="avatar">
                  <div className="w-8 h-8 rounded-full">
                    <img src={group.profilePic || "/group-avatar.png"} alt={group.name} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="text-slate-200 text-sm font-medium truncate">{group.name}</h4>
                    <Users className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {group.memberCount} members
                  </p>
                  {group.lastMessage && (
                    <p className="text-xs text-slate-500 truncate">
                      {group.lastMessage.senderId?.fullName}: {group.lastMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Direct Messages Section */}
      {chats.length > 0 && (
        <>
          <div className="px-2 py-1 mt-2">
            <p className="text-xs text-slate-400 font-medium">DIRECT MESSAGES</p>
          </div>
          {chats.map((chat) => (
            <div
              key={chat._id}
              className="bg-cyan-500/10 p-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
              onClick={() => setSelectedUser(chat)}
            >
              <div className="flex items-center gap-2">
                <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
                  <div className="w-8 h-8 rounded-full">
                    <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-200 text-sm font-medium truncate">{chat.fullName}</h4>
                  <p className="text-xs text-slate-400">
                    {onlineUsers.includes(chat._id) ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default ChatsList;