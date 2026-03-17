import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageReactions from "./MessageReactions";
import { CheckCheck, Clock, Copy, Trash2, Reply, Star, Share2, Flag, X } from "lucide-react";
import toast from "react-hot-toast";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    addReaction,
    deleteMessage,
    deleteForEveryone,
    forwardMessage,
    starMessage,
    reportMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 'auto', right: 'auto' });
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [replyToMsg, setReplyToMsg] = useState(null);
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
      subscribeToMessages();
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messageEndRef.current && messagesContainerRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Message copied to clipboard");
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = (messageId, deleteForEveryoneFlag = false) => {
    if (deleteForEveryoneFlag) {
      if (window.confirm("Delete this message for everyone?")) {
        deleteForEveryone(messageId);
        toast.success("Message deleted for everyone");
      }
    } else {
      if (window.confirm("Delete this message for yourself?")) {
        deleteMessage(messageId);
        toast.success("Message deleted");
      }
    }
    setSelectedMessageId(null);
    setShowDeleteOptions(false);
  };

  const handleReply = (msg) => {
    setReplyToMsg(msg);
    setSelectedMessageId(null);
    // Focus on input
    setTimeout(() => {
      document.querySelector('input[placeholder="Message..."]')?.focus();
    }, 100);
  };

  const handleForward = (msg) => {
    forwardMessage(msg);
    setSelectedMessageId(null);
  };

  const handleStar = (msg) => {
    starMessage(msg._id);
    setSelectedMessageId(null);
  };

  const handleReport = (msg) => {
    reportMessage(msg._id);
    setSelectedMessageId(null);
  };

  // Handle right-click (desktop)
  const handleContextMenu = (e, msg, isOwn) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e, msg, isOwn);
  };

  // Handle long press (mobile)
  const handleTouchStart = (e, msg, isOwn) => {
    e.preventDefault();
    longPressTimerRef.current = setTimeout(() => {
      // Vibrate on long press (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      showContextMenu(e, msg, isOwn);
    }, 500); // 500ms long press
  };

  // Fixed: Removed parameter completely since it's not needed
  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Fixed: Removed parameter completely since it's not needed
  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showContextMenu = (e, msg, isOwn) => {
    const touch = e.touches ? e.touches[0] : e;
    const messageElement = e.currentTarget;
    const rect = messageElement.getBoundingClientRect();
    
    let left, right;
    
    if (isOwn) {
      right = 20; // Position from right
      left = 'auto';
    } else {
      left = (touch?.clientX || rect.left) + 10;
      right = 'auto';
    }
    
    setSelectedMessageId(msg._id);
    setContextMenuPosition({
      left: left,
      right: right,
      top: (touch?.clientY || rect.top) + window.scrollY - 5
    });
    setShowDeleteOptions(false);
  };

  const handleReact = (messageId, emoji) => {
    addReaction(messageId, emoji);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedMessageId(null);
      setShowDeleteOptions(false);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  if (!selectedUser) return null;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      
      {/* Reply Preview */}
      {replyToMsg && (
        <div className="bg-slate-800/90 border-l-4 border-cyan-500 p-2 mx-2 mt-2 rounded-lg flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-cyan-400">Replying to {replyToMsg.senderId === authUser?._id ? 'yourself' : selectedUser?.fullName}</p>
            <p className="text-sm text-slate-300 truncate">{replyToMsg.text || (replyToMsg.image ? '📷 Image' : replyToMsg.audio ? '🎵 Voice message' : '')}</p>
          </div>
          <button onClick={() => setReplyToMsg(null)} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length === 0 ? (
          <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.senderId === authUser?._id;
              
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}
                  onContextMenu={(e) => handleContextMenu(e, msg, isOwn)}
                  onTouchStart={(e) => handleTouchStart(e, msg, isOwn)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {/* Reply Indicator */}
                    {msg.replyTo && (
                      <div className="mb-1 text-xs bg-slate-800/50 p-1 rounded-lg">
                        <span className="text-cyan-400">↩️ Reply to: </span>
                        <span className="text-slate-400">{msg.replyTo.text || 'message'}</span>
                      </div>
                    )}
                    
                    {/* Starred Indicator */}
                    {msg.starred && (
                      <div className="absolute -top-2 -right-2">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`
                        rounded-2xl px-2.5 py-1.5
                        ${isOwn 
                          ? 'bg-cyan-600 text-white rounded-br-none' 
                          : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }
                        ${msg.isOptimistic ? 'opacity-70' : ''}
                        ${msg.starred ? 'ring-1 ring-yellow-400' : ''}
                        ${selectedMessageId === msg._id ? 'ring-2 ring-cyan-500' : ''}
                        active:opacity-80 transition-opacity
                      `}
                    >
                      {/* Image Message */}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="rounded-lg max-w-full max-h-32 object-cover mb-1 cursor-pointer"
                          onClick={() => window.open(msg.image, '_blank')}
                        />
                      )}
                      
                      {/* Audio Message */}
                      {msg.audio && (
                        <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg mb-1">
                          <audio controls className="max-w-full h-8">
                            <source src={msg.audio} type="audio/webm" />
                          </audio>
                        </div>
                      )}
                      
                      {/* Text Message */}
                      {msg.text && (
                        <p className="text-sm break-words">{msg.text}</p>
                      )}
                      
                      {/* Message Footer */}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${
                        isOwn ? 'text-cyan-100' : 'text-slate-400'
                      }`}>
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.edited && <span className="text-[8px]">(edited)</span>}
                        {msg.deletedForEveryone && <span className="text-[8px]">(deleted)</span>}
                        {isOwn && (
                          <span className="flex items-center">
                            {msg.isOptimistic ? (
                              <Clock className="w-2.5 h-2.5" />
                            ) : (
                              <CheckCheck className="w-2.5 h-2.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reactions Component */}
                    <MessageReactions
                      messageId={msg._id}
                      reactions={msg.reactions || []}
                      onReact={handleReact}
                      currentUserId={authUser?._id}
                    />
                  </div>

                  {/* Context Menu - Shows on right-click (desktop) or long-press (mobile) */}
                  {selectedMessageId === msg._id && !showDeleteOptions && (
                    <div
                      className="fixed z-[9999] bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[160px]"
                      style={{
                        top: `${contextMenuPosition.top}px`,
                        left: contextMenuPosition.left,
                        right: contextMenuPosition.right,
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {msg.text && (
                        <button
                          onClick={() => handleCopyMessage(msg.text)}
                          className="w-full px-4 py-3 md:py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleReply(msg)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </button>
                      
                      <button
                        onClick={() => handleForward(msg)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Forward
                      </button>
                      
                      <button
                        onClick={() => handleStar(msg)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Star className={`w-4 h-4 ${msg.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        {msg.starred ? 'Unstar' : 'Star'}
                      </button>
                      
                      {isOwn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteOptions(true);
                          }}
                          className="w-full px-4 py-3 md:py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                      
                      {!isOwn && (
                        <button
                          onClick={() => handleReport(msg)}
                          className="w-full px-4 py-3 md:py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          Report
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete Options Menu */}
                  {selectedMessageId === msg._id && showDeleteOptions && (
                    <div
                      className="fixed z-[9999] bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[180px]"
                      style={{
                        top: `${contextMenuPosition.top}px`,
                        left: contextMenuPosition.left,
                        right: contextMenuPosition.right,
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <div className="px-4 py-1 text-xs text-slate-400 border-b border-slate-700">
                        Delete Message
                      </div>
                      
                      <button
                        onClick={() => handleDeleteMessage(msg._id, false)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete for me
                      </button>
                      
                      <button
                        onClick={() => handleDeleteMessage(msg._id, true)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete for everyone
                      </button>
                      
                      <button
                        onClick={() => setShowDeleteOptions(false)}
                        className="w-full px-4 py-3 md:py-2 text-sm text-slate-400 hover:bg-slate-700 flex items-center gap-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <MessageInput replyTo={replyToMsg} setReplyTo={setReplyToMsg} />
    </div>
  );
}

export default ChatContainer;