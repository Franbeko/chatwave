import React from "react";
import { X, Info, Users } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

function GroupHeader({ group, onInfoClick }) {
  const { setSelectedGroup } = useChatStore();

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-3 py-2">
      <div className="flex items-center space-x-2">
        <div className="avatar">
          <div className="w-8 h-8 rounded-full">
            <img src={group.profilePic || "/group-avatar.png"} alt={group.name} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-slate-200 font-medium text-sm">{group.name}</h3>
            <Users className="w-3 h-3 text-slate-400" />
          </div>
          <p className="text-slate-400 text-xs">{group.memberCount} members</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onInfoClick}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Info className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>
        <button
          onClick={() => setSelectedGroup(null)}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>
      </div>
    </div>
  );
}

export default GroupHeader;