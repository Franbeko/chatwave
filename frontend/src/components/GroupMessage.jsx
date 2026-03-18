import React from "react";
import { CheckCheck, Clock } from "lucide-react";

function GroupMessage({ message, isOwn, showSender }) {
  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
      <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Show sender name for group messages (if not own message) */}
        {!isOwn && showSender && (
          <p className="text-xs text-cyan-400 mb-1 ml-1">
            {message.senderId?.fullName}
          </p>
        )}
        
        {/* Message Bubble */}
        <div
          className={`
            rounded-2xl px-3 py-2
            ${isOwn 
              ? 'bg-cyan-600 text-white rounded-br-none' 
              : 'bg-slate-700 text-slate-200 rounded-bl-none'
            }
            ${message.isOptimistic ? 'opacity-70' : ''}
          `}
        >
          {/* Image Message */}
          {message.image && (
            <img 
              src={message.image} 
              alt="" 
              className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer"
              onClick={() => window.open(message.image, '_blank')}
            />
          )}
          
          {/* Audio Message */}
          {message.audio && (
            <div className="flex items-center gap-2 mb-1">
              <audio controls className="max-w-full h-8">
                <source src={message.audio} type="audio/webm" />
              </audio>
            </div>
          )}
          
          {/* Text Message */}
          {message.text && (
            <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
          )}
          
          {/* Message Footer */}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            isOwn ? 'text-cyan-100' : 'text-slate-400'
          }`}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwn && (
              <span className="flex items-center">
                {message.isOptimistic ? (
                  <Clock className="w-2.5 h-2.5" />
                ) : (
                  <CheckCheck className="w-2.5 h-2.5" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupMessage;