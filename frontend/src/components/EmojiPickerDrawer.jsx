import React, { useState, useRef, useEffect } from "react";
import { Smile, Image as ImageIcon, Sticker } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

function EmojiPickerDrawer({ onEmojiSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji");
  const buttonRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent Enter key from toggling the picker
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.stopPropagation(); // Stop Enter from bubbling up
    }
  };

  const tabs = [
    { id: "emoji", label: "Emojis", icon: Smile },
    { id: "gif", label: "GIFs", icon: ImageIcon },
    { id: "sticker", label: "Stickers", icon: Sticker },
  ];

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors relative group"
        type="button" // Explicitly set type to button to prevent form submission
      >
        <Smile className="w-4 h-4" />
        
        {/* Tooltip */}
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                       bg-slate-800 text-white text-[10px] sm:text-xs 
                       px-2 py-1 rounded opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-slate-700
                       hidden sm:block">
          Emojis, GIFs, and Stickers
        </span>
        
        {/* Mobile tooltip */}
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                       bg-slate-800 text-white text-[10px] 
                       px-2 py-1 rounded opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-slate-700
                       block sm:hidden">
          Emojis & GIFs
        </span>
      </button>

      {isOpen && (
        <div
          ref={drawerRef}
          className="absolute bottom-full left-0 mb-2 w-[280px] sm:w-[320px] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden z-50"
        >
          {/* Header with tabs */}
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  type="button"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === "emoji" ? "😊" : tab.id === "gif" ? "GIF" : "🎯"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="h-[300px] sm:h-[350px] overflow-y-auto">
            {activeTab === "emoji" && (
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  onEmojiSelect(emojiData.emoji);
                  setIsOpen(false);
                }}
                theme="dark"
                width="100%"
                height={300}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            )}

            {activeTab === "gif" && (
              <div className="p-4 text-center text-slate-400">
                <p className="text-sm mb-2">GIFs coming soon!</p>
                <p className="text-xs hidden sm:block">Connect to GIPHY API to enable GIFs</p>
              </div>
            )}

            {activeTab === "sticker" && (
              <div className="p-4 text-center text-slate-400">
                <p className="text-sm mb-2">Stickers coming soon!</p>
                <p className="text-xs hidden sm:block">Custom stickers will be available soon</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmojiPickerDrawer;