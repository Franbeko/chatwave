import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, X } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuthStore } from '../store/useAuthStore';

function CallModal({ 
  isOpen, 
  onClose, 
  callType, 
  remoteUser, 
  callId,
  isIncoming = false,
  onAccept,
  onReject
}) {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'connecting');
  const [duration, setDuration] = useState(0);
  const { authUser } = useAuthStore();
  const socket = useAuthStore((state) => state.socket);
  
  const {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    endCall: endWebRTCCall,
    initPeer,
    makeCall
  } = useWebRTC({
    callType,
    onRemoteStream: () => setCallStatus('connected'),
    onCallEnded: () => {
      setCallStatus('ended');
      setTimeout(() => onClose(), 2000);
    }
  });

  useEffect(() => {
    if (isOpen && authUser) {
      initPeer(authUser._id);
    }
  }, [isOpen, authUser, initPeer]);

  useEffect(() => {
    if (callStatus === 'connected') {
      const timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [callStatus]);

  useEffect(() => {
    if (!isIncoming && remoteUser && callStatus === 'connecting') {
      // Small delay to ensure peer is initialized
      setTimeout(() => {
        makeCall(remoteUser._id);
      }, 1000);
    }
  }, [isIncoming, remoteUser, callStatus, makeCall]);

  // Listen for call events via socket
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = (data) => {
      if (data.callId === callId) {
        setCallStatus('connected');
      }
    };

    const handleCallRejected = (data) => {
      if (data.callId === callId) {
        setCallStatus('ended');
        setTimeout(() => onClose(), 2000);
      }
    };

    const handleCallEnded = (data) => {
      if (data.callId === callId) {
        setCallStatus('ended');
        setTimeout(() => onClose(), 2000);
      }
    };

    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket, callId, onClose]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (socket && callId) {
      const participants = [authUser._id];
      if (remoteUser) participants.push(remoteUser._id);
      
      socket.emit('end-call', {
        callId,
        participants
      });
    }
    endWebRTCCall();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center">
      {/* Video Grid */}
      <div className="relative w-full h-full">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${callType === 'audio' ? 'hidden' : ''}`}
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-20 right-4 w-48 h-64 rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Call Info Overlay */}
        <div className="absolute top-8 left-0 right-0 text-center">
          <h2 className="text-2xl font-bold text-white">{remoteUser?.fullName}</h2>
          <p className="text-slate-300 mt-1">
            {callStatus === 'ringing' && 'Ringing...'}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && formatDuration(duration)}
            {callStatus === 'ended' && 'Call ended'}
          </p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Video Toggle Button (for video calls) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* Accept Call Button (for incoming calls) */}
          {isIncoming && callStatus === 'ringing' && (
            <button
              onClick={onAccept}
              className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors animate-pulse"
            >
              <Phone className="w-6 h-6" />
            </button>
          )}

          {/* Reject Call Button (for incoming calls) */}
          {isIncoming && callStatus === 'ringing' && (
            <button
              onClick={onReject}
              className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallModal;