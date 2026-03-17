import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function MessageReactions({ messageId, reactions = [], onReact, currentUserId }) {
  const [showPicker, setShowPicker] = useState(false);
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);

  // Group reactions by emoji
  const reactionCounts = reactions.reduce((acc, reaction) => {
    const existing = acc.find(r => r.emoji === reaction.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(reaction.userId);
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.userId]
      });
    }
    return acc;
  }, []);

  // Check if current user reacted with specific emoji
  const hasUserReacted = (emoji) => {
    return reactions.some(r => r.emoji === emoji && r.userId === currentUserId);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReactionClick = (emoji) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  const togglePicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPicker(!showPicker);
  };

  return (
    <div className="relative mt-1">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-1 flex-wrap bg-slate-800/30 rounded-full p-1 w-fit">
        {/* Quick reactions */}
        {commonReactions.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReactionClick(emoji);
            }}
            className={`text-base hover:scale-110 transition-transform px-0.5 ${
              hasUserReacted(emoji) ? "opacity-100" : "opacity-60 hover:opacity-100"
            }`}
          >
            {emoji}
          </button>
        ))}

        {/* Add reaction button */}
        <button
          ref={buttonRef}
          onClick={togglePicker}
          className="p-0.5 rounded-full hover:bg-slate-700 text-slate-400 cursor-pointer"
          type="button"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Reaction counts below */}
      {reactionCounts.length > 0 && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {reactionCounts.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReactionClick(reaction.emoji);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] cursor-pointer ${
                hasUserReacted(reaction.emoji)
                  ? "bg-cyan-500/30 text-cyan-300"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
              title={reaction.users.join(', ')}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Compact Emoji Picker - Positioned BELOW the message */}
      {showPicker && (
        <div 
          ref={pickerRef}
          className="absolute top-full left-0 mt-1 z-[9999]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-slate-800 rounded-lg shadow-2xl overflow-hidden">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                handleReactionClick(emojiData.emoji);
              }}
              autoFocusSearch={true}
              theme="dark"
              skinTonesDisabled={true}
              searchPlaceholder="Search..."
              width={220}
              height={260}
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis={true}
              searchDisabled={false}
              emojiStyle="native"
              suggestedEmojisMode="none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageReactions;