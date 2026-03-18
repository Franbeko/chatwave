import { Navigate, Route, Routes } from 'react-router';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { useAuthStore } from './store/useAuthStore';
import { useEffect, useState } from 'react';
import PageLoader from './components/PageLoader';
import { Toaster } from 'react-hot-toast';
import CallModal from './components/CallModal';
import IncomingCallModal from './components/IncomingCallModal';
import { axiosInstance } from './lib/axios';

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
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

  useEffect(() => {
    // Listen for call events
    const handleOpenCall = (e) => {
      setCallModal({
        isOpen: true,
        ...e.detail
      });
    };

    const handleIncomingCall = (e) => {
      setIncomingCall(e.detail);
    };

    const handleCallAccepted = () => { // Removed unused 'e' parameter
      setCallModal(prev => ({ ...prev, isOpen: true, isIncoming: false }));
      setIncomingCall(null);
    };

    const handleCallRejected = () => {
      setIncomingCall(null);
    };

    const handleCallEnded = () => {
      setCallModal(prev => ({ ...prev, isOpen: false }));
      setIncomingCall(null);
    };

    window.addEventListener('openCall', handleOpenCall);
    window.addEventListener('incomingCall', handleIncomingCall);
    window.addEventListener('callAccepted', handleCallAccepted);
    window.addEventListener('callRejected', handleCallRejected);
    window.addEventListener('callEnded', handleCallEnded);

    // Socket listeners
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.on('incomingCall', (data) => {
        window.dispatchEvent(new CustomEvent('incomingCall', { detail: data }));
      });

      socket.on('callAccepted', (data) => {
        window.dispatchEvent(new CustomEvent('callAccepted', { detail: data }));
      });

      socket.on('callRejected', (data) => {
        window.dispatchEvent(new CustomEvent('callRejected', { detail: data }));
      });

      socket.on('callEnded', (data) => {
        window.dispatchEvent(new CustomEvent('callEnded', { detail: data }));
      });
    }

    return () => {
      window.removeEventListener('openCall', handleOpenCall);
      window.removeEventListener('incomingCall', handleIncomingCall);
      window.removeEventListener('callAccepted', handleCallAccepted);
      window.removeEventListener('callRejected', handleCallRejected);
      window.removeEventListener('callEnded', handleCallEnded);
      
      if (socket) {
        socket.off('incomingCall');
        socket.off('callAccepted');
        socket.off('callRejected');
        socket.off('callEnded');
      }
    };
  }, []);

  const handleAcceptCall = async () => {
    if (incomingCall) {
      try {
        await axiosInstance.post(`/calls/${incomingCall.callId}/accept`);
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
      } catch (error) {
        console.error('Failed to accept call:', error);
      }
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      try {
        await axiosInstance.post(`/calls/${incomingCall.callId}/reject`);
        setIncomingCall(null);
      } catch (error) {
        console.error('Failed to reject call:', error);
      }
    }
  };

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