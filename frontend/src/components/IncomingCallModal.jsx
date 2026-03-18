import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

function IncomingCallModal({ caller, callType, onAccept, onReject }) {
  return (
    <div className="fixed top-4 right-4 w-80 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 z-[9999] animate-slideIn">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={caller.pic || "/avatar.png"}
            alt={caller.name}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="text-white font-medium">{caller.name}</h3>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              <Video className="w-3 h-3" />
              Incoming {callType} call...
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;