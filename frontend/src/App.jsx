import { Navigate, Route, Routes } from 'react-router';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { useAuthStore } from './store/useAuthStore';
import { useEffect, useState, useCallback } from 'react';
import PageLoader from './components/PageLoader';
import { Toaster } from 'react-hot-toast';
import CallModal from './components/CallModal';
import IncomingCallModal from './components/IncomingCallModal';
// Remove axiosInstance import if not used
// import { axiosInstance } from './lib/axios';

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const [callModal, setCallModal] = useState({
    isOpen: false,
    callType: null,
    remoteUser: null,
    callId: null,
    isIncoming: false
  });
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log('No socket connection yet');
      return;
    }

    console.log('Setting up socket listeners for calls');

    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call received:', data);
      setIncomingCall(data);
    };

    const handleCallAccepted = (data) => {
      console.log('✅ Call accepted event:', data);
      setCallModal(prev => {
        if (prev.callId === data.callId) {
          return { ...prev, isOpen: true, isIncoming: false };
        }
        return prev;
      });
      setIncomingCall(null);
    };

    const handleCallRejected = (data) => {
      console.log('❌ Call rejected event:', data);
      setIncomingCall(null);
    };

    const handleCallFailed = (data) => {
      console.log('⚠️ Call failed:', data);
      setCallModal(prev => ({ ...prev, isOpen: false }));
      setIncomingCall(null);
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-failed', handleCallFailed);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-failed', handleCallFailed);
    };
  }, [socket]);

  // Listen for custom openCall event
  useEffect(() => {
    const handleOpenCall = (e) => {
      console.log('Opening call modal:', e.detail);
      setCallModal({
        isOpen: true,
        ...e.detail
      });
    };

    window.addEventListener('openCall', handleOpenCall);
    return () => window.removeEventListener('openCall', handleOpenCall);
  }, []);

  const handleAcceptCall = useCallback(() => {
    if (incomingCall && socket) {
      console.log('Accepting call:', incomingCall.callId);
      
      socket.emit('accept-call', {
        callId: incomingCall.callId,
        receiverId: authUser._id,
        callerId: incomingCall.callerId,
        receiverName: authUser.fullName
      });

      setCallModal({
        isOpen: true,
        callType: incomingCall.type,
        remoteUser: { 
          _id: incomingCall.callerId, 
          fullName: incomingCall.callerName,
          profilePic: incomingCall.callerPic
        },
        callId: incomingCall.callId,
        isIncoming: true
      });
      setIncomingCall(null);
    }
  }, [incomingCall, socket, authUser]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall && socket) {
      console.log('Rejecting call:', incomingCall.callId);
      
      socket.emit('reject-call', {
        callId: incomingCall.callId,
        callerId: incomingCall.callerId
      });
      setIncomingCall(null);
    }
  }, [incomingCall, socket]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div className='min-h-screen bg-slate-900 relative flex items-center justify-center p-1 md:p-2 overflow-hidden'>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />

      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
      </Routes>

      {/* Call Modal */}
      <CallModal
        isOpen={callModal.isOpen}
        onClose={() => setCallModal({ ...callModal, isOpen: false })}
        callType={callModal.callType}
        remoteUser={callModal.remoteUser}
        callId={callModal.callId}
        isIncoming={callModal.isIncoming}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallModal
          caller={{
            name: incomingCall.callerName,
            pic: incomingCall.callerPic
          }}
          callType={incomingCall.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      <Toaster />
    </div>
  );
}

export default App;