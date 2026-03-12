import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { Loader2 } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    resetMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Initial load and cleanup
  useEffect(() => {
    resetMessages();
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
      resetMessages();
    };
  }, [selectedUser._id]);

  // Scroll to bottom only on new messages (not on load more)
  useEffect(() => {
    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    
    if (hasNewMessage && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Setup intersection observer for infinite scroll
  const lastMessageRef = useCallback((node) => {
    if (isMessagesLoading || isLoadingMore) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreMessages) {
        loadMoreMessages();
      }
    });

    if (node) {
      observerRef.current.observe(node);
    }
  }, [isMessagesLoading, isLoadingMore, hasMoreMessages, loadMoreMessages]);

  return (
    <>
      <ChatHeader />
      <div 
        ref={scrollContainerRef}
        className="flex-1 px-4 md:px-6 overflow-y-auto py-6 md:py-8"
      >
        <div className="max-w-3xl w-full mx-auto px-2 md:px-0">
          
          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && !isMessagesLoading ? (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isFirstMessage = index === 0;
                
                return (
                  <div
                    key={msg._id}
                    ref={isFirstMessage ? lastMessageRef : null}
                    className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"}`}
                  >
                    <div
                      className={`chat-bubble relative ${
                        msg.senderId === authUser._id
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      } ${msg.isOptimistic ? "opacity-70" : ""}`}
                    >
                      {/* Image Message */}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="rounded-lg max-h-48 object-cover" 
                        />
                      )}
                      
                      {/* Audio Message */}
                      {msg.audio && (
                        <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded">
                          <audio controls className="max-w-full h-8">
                            <source src={msg.audio} type="audio/wav" />
                          </audio>
                        </div>
                      )}
                      
                      {/* Text Message */}
                      {msg.text && (
                        <p className={msg.image ? "mt-2" : ""}>{msg.text}</p>
                      )}
                      
                      {/* Timestamp */}
                      <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {msg.isOptimistic && (
                          <span className="text-xs">(sending...)</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* scroll target for new messages */}
              <div ref={messageEndRef} />
            </div>
          ) : isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : (
            <NoChatHistoryPlaceholder name={selectedUser.fullName} />
          )}
        </div>
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;