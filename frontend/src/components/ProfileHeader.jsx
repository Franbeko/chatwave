import { useState, useRef } from "react";
import { LogOut, Volume2, VolumeX, Search, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import SearchModal from "./SearchModal";
import CreateGroupModal from "./CreateGroupModal";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

function ProfileHeader() {
  const { logout, authUser, updateProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleGroupCreated = (group) => {
    const { setSelectedGroup } = useChatStore.getState();
    setSelectedGroup(group);
  };

  return (
    <>
      <div className="p-2 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {/* Left side - Avatar and Name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            {/* AVATAR */}
            <div className="avatar online flex-shrink-0">
              <button
                className="w-9 h-9 rounded-full overflow-hidden relative group"
                onClick={() => fileInputRef.current.click()}
              >
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="User image"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <span className="text-white text-[8px]">Edit</span>
                </div>
              </button>

              <input
                type="file"
                accept="images/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* USERNAME - with truncate */}
            <div className="min-w-0">
              <h3 className="text-slate-200 font-medium text-xs truncate max-w-[100px] md:max-w-[120px]">
                {authUser.fullName}
              </h3>
              <p className="text-slate-400 text-[9px]">Online</p>
            </div>
          </div>

          {/* Right side - All Icons */}
          <div className="flex items-center gap-0.5">
            {/* CREATE GROUP BUTTON */}
            <button
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-700/50"
              onClick={() => setIsCreateGroupOpen(true)}
              title="Create New Group"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* SEARCH BUTTON */}
            <button
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-700/50"
              onClick={() => setIsSearchOpen(true)}
              title="Search Users"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* SOUND TOGGLE */}
            <button
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-700/50"
              onClick={() => {
                mouseClickSound.currentTime = 0;
                mouseClickSound.play().catch(() => {});
                toggleSound();
              }}
              title={isSoundEnabled ? "Mute Sounds" : "Unmute Sounds"}
            >
              {isSoundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* LOGOUT BUTTON - Now clearly visible */}
            <button
              className="text-red-400 hover:text-red-300 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 ml-0.5"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={handleGroupCreated}
      />
    </>
  );
}

export default ProfileHeader;