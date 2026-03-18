import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const commonReactions = ["👍", "❤️", "😂", "😮", "😢"];

function MessageReactions({ messageId, reactions = [], onReact, currentUserId }) {
  const [showAllReactions, setShowAllReactions] = useState(false);
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);

  // Group reactions by emoji
  const reactionCounts = (reactions || []).reduce((acc, reaction) => {
    if (!reaction || !reaction.emoji) return acc;
    
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
    return (reactions || []).some(r => r?.emoji === emoji && r?.userId === currentUserId);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowAllReactions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReactionClick = (emoji) => {
    if (onReact && messageId) {
      onReact(messageId, emoji);
    }
    setShowAllReactions(false);
  };

  return (
    <div className="relative mt-1">
      {/* Reaction counts - Always visible */}
      {reactionCounts.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-1">
          {reactionCounts.map((reaction, index) => (
            <button
              key={index}
              onClick={() => handleReactionClick(reaction.emoji)}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all ${
                hasUserReacted(reaction.emoji)
                  ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
              title={reaction.users?.join(', ') || ''}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hover area for reactions */}
      <div className="relative group">
        {/* Invisible hover area */}
        <div className="absolute inset-0" />
        
        {/* Reaction bar that appears on hover */}
        <div className="absolute top-full left-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-slate-800 rounded-full px-2 py-1 shadow-lg border border-slate-700 flex items-center gap-1">
          {commonReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={`text-lg hover:scale-125 transition-transform px-1 ${
                hasUserReacted(emoji) ? "opacity-100" : "opacity-70 hover:opacity-100"
              }`}
            >
              {emoji}
            </button>
          ))}
          <button
            ref={buttonRef}
            onClick={() => setShowAllReactions(!showAllReactions)}
            className="p-0.5 rounded-full hover:bg-slate-700 text-slate-400"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Full emoji picker */}
        {showAllReactions && (
          <div 
            ref={pickerRef}
            className="absolute top-full left-0 mt-12 z-30"
          >
            <div className="relative bg-slate-800 rounded-lg shadow-2xl overflow-hidden border border-slate-700">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  if (emojiData && emojiData.emoji) {
                    handleReactionClick(emojiData.emoji);
                  }
                }}
                autoFocusSearch={true}
                theme="dark"
                skinTonesDisabled={true}
                searchPlaceholder="Search emoji..."
                width={280}
                height={350}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageReactions;