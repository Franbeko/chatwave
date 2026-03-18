import { useRef, useState, useEffect } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { Image, Send, X, Mic, Square, Play, Pause, Smile } from "lucide-react";
import EmojiPickerDrawer from "./EmojiPickerDrawer";

function MessageInput({ replyTo, setReplyTo }) {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { sendMessage, isSoundEnabled, emitTypingStatus, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTypingStatus(false);
    };
  }, [audioUrl, emitTypingStatus]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (isSending) return;
    if (!text.trim() && !imagePreview && !audioBlob) return;
    
    setIsSending(true);
    if (isSoundEnabled) playRandomKeyStrokeSound();

    try {
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
      }

      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        audio: audioBase64,
        replyTo: replyTo ? { 
          id: replyTo._id, 
          text: replyTo.text, 
          sender: replyTo.senderId 
        } : null
      });
      
      setText("");
      setImagePreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      if (setReplyTo) setReplyTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      emitTypingStatus(false);
      setIsTyping(false);
      
    } catch {
      // Removed the unused error parameter - this fixes the red line
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    if (isSoundEnabled) playRandomKeyStrokeSound();
    
    if (!isTyping && newText.length > 0) {
      setIsTyping(true);
      emitTypingStatus(true);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emitTypingStatus(false);
      }
    }, 2000);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-slate-800/50 border-t border-slate-700/50 px-3 py-2">
      {/* Reply Preview */}
      {replyTo && (
        <div className="max-w-3xl mx-auto mb-2 bg-slate-700/50 rounded-lg p-2 flex items-center justify-between border-l-4 border-cyan-500">
          <div className="flex-1">
            <p className="text-xs text-cyan-400">Replying to {replyTo.senderId === authUser?._id ? 'yourself' : selectedUser?.fullName}</p>
            <p className="text-sm text-slate-300 truncate">{replyTo.text || (replyTo.image ? '📷 Image' : replyTo.audio ? '🎵 Voice' : '')}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-600 rounded-full">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-600" />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 border border-slate-600"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {audioUrl && !isRecording && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-slate-700/50 p-1.5 rounded-lg w-fit">
          <button onClick={togglePlayAudio} className="p-1 rounded-full bg-cyan-600 text-white">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <span className="text-xs text-slate-300">{formatTime(recordingTime)}</span>
          <button onClick={removeAudio} className="p-1 hover:bg-slate-600 rounded-full">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-red-500/20 p-1.5 rounded-lg w-fit">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-400">{formatTime(recordingTime)}</span>
          <button onClick={stopRecording} className="p-1 bg-red-500/20 text-red-400 rounded-full">
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Area - Icon sizes reduced to match screenshot */}
      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
        <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg border border-slate-600/50 p-1">
          <EmojiPickerDrawer onEmojiSelect={handleEmojiSelect} />
          
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={replyTo ? "Reply..." : "Message..."}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 px-2 py-1.5 text-sm focus:outline-none"
            disabled={isSending}
          />

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-1.5 rounded-lg transition-colors ${
              isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-600 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 rounded-lg transition-colors ${
              imagePreview ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-600 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={(!text.trim() && !imagePreview && !audioBlob) || isSending}
            className="p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;