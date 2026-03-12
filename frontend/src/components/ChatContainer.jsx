import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { CheckCheck, Clock } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

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

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      
      {/* Messages Container - Scrollable Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length === 0 ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === authUser._id;
              
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`
                        rounded-2xl px-3 py-2 md:px-4 md:py-2.5
                        ${isOwn 
                          ? 'bg-cyan-600 text-white rounded-br-none' 
                          : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }
                        ${msg.isOptimistic ? 'opacity-70' : ''}
                      `}
                    >
                      {/* Image Message */}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="rounded-lg max-w-full max-h-48 object-cover mb-2"
                        />
                      )}
                      
                      {/* Text Message */}
                      {msg.text && (
                        <p className="text-sm md:text-base break-words">{msg.text}</p>
                      )}
                      
                      {/* Message Footer - Time and Status */}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                        isOwn ? 'text-cyan-100' : 'text-slate-400'
                      }`}>
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isOwn && (
                          <span className="flex items-center">
                            {msg.isOptimistic ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <CheckCheck className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
}

export default ChatContainer;