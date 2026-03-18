import React, { useState, useRef, useEffect } from "react"; // Added React import
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

  const tabs = [
    { id: "emoji", label: "Emojis", icon: Smile },
    { id: "gif", label: "GIFs", icon: ImageIcon },
    { id: "sticker", label: "Stickers", icon: Sticker },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors relative group"
      >
        <Smile className="w-3.5 h-3.5" />
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-slate-700">
          Emojis, GIFs, and Stickers
        </span>
      </button>

      {isOpen && (
        <div
          ref={drawerRef}
          className="absolute bottom-full left-0 mb-2 w-[320px] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden z-50"
        >
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
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="h-[350px] overflow-y-auto">
            {activeTab === "emoji" && (
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  onEmojiSelect(emojiData.emoji);
                  setIsOpen(false);
                }}
                theme="dark"
                width="100%"
                height={350}
                previewConfig={{ showPreview: false }}
              />
            )}

            {activeTab === "gif" && (
              <div className="p-4 text-center text-slate-400">
                <p className="text-sm mb-2">GIFs coming soon!</p>
              </div>
            )}

            {activeTab === "sticker" && (
              <div className="p-4 text-center text-slate-400">
                <p className="text-sm mb-2">Stickers coming soon!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmojiPickerDrawer;