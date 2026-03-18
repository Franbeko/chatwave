import React, { useEffect, useRef, useState } from "react";
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
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatMessageTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success("Message copied");
    }
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = (messageId, deleteForEveryoneFlag = false) => {
    if (deleteForEveryoneFlag) {
      if (window.confirm("Delete for everyone?")) {
        deleteForEveryone(messageId);
      }
    } else {
      if (window.confirm("Delete for you?")) {
        deleteMessage(messageId);
      }
    }
    setSelectedMessageId(null);
    setShowDeleteOptions(false);
  };

  const handleReply = (msg) => {
    setReplyToMsg(msg);
    setSelectedMessageId(null);
    setTimeout(() => {
      document.querySelector('input[placeholder="Message..."]')?.focus();
    }, 100);
  };

  const handleForward = (msg) => {
    forwardMessage(msg);
    setSelectedMessageId(null);
  };

  const handleStar = (msg) => {
    if (msg && msg._id) {
      starMessage(msg._id);
    }
    setSelectedMessageId(null);
  };

  const handleReport = (msg) => {
    if (msg && msg._id) {
      reportMessage(msg._id);
    }
    setSelectedMessageId(null);
  };

  const handleContextMenu = (e, msg, isOwn) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e, msg, isOwn);
  };

  const handleTouchStart = (e, msg, isOwn) => {
    e.preventDefault();
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      showContextMenu(e, msg, isOwn);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

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
      right = 20;
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
    if (messageId && emoji) {
      addReaction(messageId, emoji);
    }
  };

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
  if (!authUser) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <ChatHeader />
      
      {/* Reply Preview */}
      {replyToMsg && (
        <div className="bg-slate-800/90 border-l-4 border-cyan-500 p-2 mx-2 mt-2 rounded-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-cyan-400">Replying to {replyToMsg.senderId === authUser?._id ? 'yourself' : selectedUser?.fullName}</p>
              <p className="text-sm text-slate-300 truncate">{replyToMsg.text || (replyToMsg.image ? '📷 Image' : replyToMsg.audio ? '🎵 Voice message' : '')}</p>
            </div>
            <button onClick={() => setReplyToMsg(null)} className="p-1 hover:bg-slate-700 rounded">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 py-2"
      >
        <div className="max-w-3xl mx-auto space-y-1">
          {isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : !messages || messages.length === 0 ? (
            <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
          ) : (
            <>
              {messages.map((msg, index) => {
                if (!msg) return null;
                const isOwn = msg.senderId === authUser?._id;
                const showDate = index === 0 || 
                  (messages[index - 1] && 
                   new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString());
                
                return (
                  <React.Fragment key={msg._id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
                          {new Date(msg.createdAt).toLocaleDateString([], { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                    
                    <div
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
                      onContextMenu={(e) => handleContextMenu(e, msg, isOwn)}
                      onTouchStart={(e) => handleTouchStart(e, msg, isOwn)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                    >
                      <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        {/* Message Bubble */}
                        <div
                          className={`
                            rounded-2xl px-3 py-2
                            ${isOwn 
                              ? 'bg-cyan-600 text-white rounded-br-none' 
                              : 'bg-slate-700 text-slate-200 rounded-bl-none'
                            }
                            ${msg.isOptimistic ? 'opacity-70' : ''}
                            ${msg.starred ? 'ring-1 ring-yellow-400' : ''}
                            ${selectedMessageId === msg._id ? 'ring-2 ring-cyan-500' : ''}
                          `}
                        >
                          {/* Reply Indicator */}
                          {msg.replyTo && (
                            <div className="mb-1 border-l-2 border-cyan-400 pl-2 text-xs opacity-80">
                              <span className="text-cyan-400">↩️ </span>
                              <span>{msg.replyTo.text?.substring(0, 30) || 'message'}</span>
                            </div>
                          )}
                          
                          {/* Image Message */}
                          {msg.image && (
                            <img 
                              src={msg.image} 
                              alt="" 
                              className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer"
                              onClick={() => window.open(msg.image, '_blank')}
                            />
                          )}
                          
                          {/* Audio Message */}
                          {msg.audio && (
                            <div className="flex items-center gap-2 mb-1">
                              <audio controls className="max-w-full h-8">
                                <source src={msg.audio} type="audio/webm" />
                              </audio>
                            </div>
                          )}
                          
                          {/* Text Message */}
                          {msg.text && (
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                          )}
                          
                          {/* Message Footer */}
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isOwn ? 'text-cyan-100' : 'text-slate-400'
                          }`}>
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {msg.edited && <span>edited</span>}
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

                      {/* Context Menu */}
                      {selectedMessageId === msg._id && !showDeleteOptions && (
                        <div
                          className="fixed z-[9999] bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[160px]"
                          style={{
                            top: `${contextMenuPosition.top}px`,
                            left: contextMenuPosition.left,
                            right: contextMenuPosition.right,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {msg.text && (
                            <button
                              onClick={() => handleCopyMessage(msg.text)}
                              className="w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copy
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleReply(msg)}
                            className="w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Reply className="w-4 h-4" />
                            Reply
                          </button>
                          
                          <button
                            onClick={() => handleForward(msg)}
                            className="w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            Forward
                          </button>
                          
                          <button
                            onClick={() => handleStar(msg)}
                            className="w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
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
                              className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                          
                          {!isOwn && (
                            <button
                              onClick={() => handleReport(msg)}
                              className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Flag className="w-4 h-4" />
                              Report
                            </button>
                          )}
                        </div>
                      )}

                      {/* Delete Options */}
                      {selectedMessageId === msg._id && showDeleteOptions && (
                        <div
                          className="fixed z-[9999] bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[180px]"
                          style={{
                            top: `${contextMenuPosition.top}px`,
                            left: contextMenuPosition.left,
                            right: contextMenuPosition.right,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-4 py-1 text-xs text-slate-400 border-b border-slate-700">
                            Delete Message
                          </div>
                          
                          <button
                            onClick={() => handleDeleteMessage(msg._id, false)}
                            className="w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete for me
                          </button>
                          
                          <button
                            onClick={() => handleDeleteMessage(msg._id, true)}
                            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete for everyone
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteOptions(false)}
                            className="w-full px-4 py-2 text-sm text-slate-400 hover:bg-slate-700 flex items-center gap-2"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messageEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput replyTo={replyToMsg} setReplyTo={setReplyToMsg} />
    </div>
  );
}

export default ChatContainer;