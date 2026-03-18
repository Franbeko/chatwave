import { useState, useRef, useEffect, useCallback } from 'react';
import Peer from 'peerjs';

export const useWebRTC = ({ callType, onRemoteStream, onCallEnded }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize local media
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [callType]);

  // Initialize PeerJS
  const initPeer = useCallback((userId) => {
    const newPeer = new Peer(userId, {
      host: 'localhost',
      port: 3001,
      path: '/peerjs',
      secure: false,
      debug: 3
    });

    newPeer.on('open', (id) => {
      console.log('PeerJS connection opened with ID:', id);
    });

    newPeer.on('call', async (call) => {
      const stream = localStream || await initLocalMedia();
      call.answer(stream);
      
      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        onRemoteStream?.(remoteStream);
      });

      call.on('close', () => {
        console.log('Call closed');
        onCallEnded?.();
      });

      setConnection(call);
    });

    setPeer(newPeer);
    return newPeer;
  }, [localStream, initLocalMedia, onRemoteStream, onCallEnded]);

  // Make a call
  const makeCall = useCallback(async (targetPeerId) => {
    try {
      const stream = localStream || await initLocalMedia();
      
      if (!peer) {
        console.error('Peer not initialized');
        return;
      }

      const call = peer.call(targetPeerId, stream);

      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        onRemoteStream?.(remoteStream);
      });

      call.on('close', () => {
        console.log('Call closed');
        onCallEnded?.();
      });

      setConnection(call);
    } catch (error) {
      console.error('Error making call:', error);
    }
  }, [localStream, initLocalMedia, peer, onRemoteStream, onCallEnded]);

  // Toggle audio
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!videoTracks[0]?.enabled);
    }
  }, [localStream]);

  // End call
  const endCall = useCallback(() => {
    if (connection) {
      connection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnection(null);
  }, [connection, localStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (connection) {
        connection.close();
      }
      if (peer) {
        peer.destroy();
      }
    };
  }, [localStream, connection, peer]);

  return {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    initLocalMedia,
    initPeer,
    makeCall,
    toggleMute,
    toggleVideo,
    endCall
  };
};