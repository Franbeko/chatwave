import { useRef, useState, useEffect } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore"; // Add this import
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon, MicIcon, SquareIcon, PlayIcon, PauseIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

function MessageInput({ replyTo, setReplyTo }) {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { sendMessage, isSoundEnabled, emitTypingStatus, selectedUser } = useChatStore();
  const { authUser } = useAuthStore(); // Get authUser from store

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTypingStatus(false);
    };
  }, [audioUrl, emitTypingStatus]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioBlob) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
      audio: audioBlob,
      replyTo: replyTo ? { id: replyTo._id, text: replyTo.text, sender: replyTo.senderId } : null
    });
    
    // Reset all states
    setText("");
    setImagePreview("");
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (setReplyTo) setReplyTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    emitTypingStatus(false);
    setIsTyping(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
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

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
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
      
    } catch (error) {
      console.error("Recording error:", error);
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

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  // Handle typing indicator
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    if (isSoundEnabled) playRandomKeyStrokeSound();
    
    if (!isTyping && newText.length > 0) {
      setIsTyping(true);
      emitTypingStatus(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emitTypingStatus(false);
      }
    }, 2000);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/50 p-1.5">
      {/* Reply Preview */}
      {replyTo && (
        <div className="max-w-3xl mx-auto mb-1 bg-slate-800/90 rounded-lg p-1 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[10px] text-cyan-400">Replying to {replyTo.senderId === authUser?._id ? 'yourself' : selectedUser?.fullName}</p>
            <p className="text-xs text-slate-300 truncate">{replyTo.text || (replyTo.image ? '📷 Image' : replyTo.audio ? '🎵 Voice message' : '')}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-0.5 hover:bg-slate-700 rounded">
            <XIcon className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}
      
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-14 left-1 md:left-2 z-50 shadow-xl"
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            autoFocusSearch={false}
            theme="dark"
            skinTonesDisabled
            searchPlaceholder="Search..."
            width={260}
            height={300}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-1">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 border border-slate-600"
              type="button"
            >
              <XIcon className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Audio Preview with Play Button */}
      {audioUrl && !isRecording && (
        <div className="max-w-3xl mx-auto mb-1 flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={togglePlayAudio}
            className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          >
            {isPlaying ? (
              <PauseIcon className="w-3 h-3" />
            ) : (
              <PlayIcon className="w-3 h-3" />
            )}
          </button>
          <span className="text-[10px] text-slate-400">{formatTime(recordingTime)}</span>
          <button
            onClick={removeAudio}
            className="p-0.5 rounded-full hover:bg-slate-700"
          >
            <XIcon className="w-2.5 h-2.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="max-w-3xl mx-auto mb-1 flex items-center gap-1 bg-red-500/20 p-1 rounded-lg w-fit">
          <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-red-400">{formatTime(recordingTime)}</span>
          <button
            onClick={stopRecording}
            className="p-0.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <SquareIcon className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
        <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
              showEmojiPicker 
                ? "bg-cyan-500/20 text-cyan-400" 
                : "hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <SmileIcon className="w-3.5 h-3.5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowEmojiPicker(false);
                setReplyTo(null);
              }
            }}
            onBlur={() => {
              if (isTyping) {
                setIsTyping(false);
                emitTypingStatus(false);
              }
            }}
            className="flex-1 bg-transparent py-1 px-1 text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
            placeholder={replyTo ? "Reply to message..." : "Message..."}
          />

          {/* Voice Recording Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
              isRecording 
                ? "bg-red-500/20 text-red-400 animate-pulse" 
                : "hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <MicIcon className="w-3.5 h-3.5" />
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
              imagePreview 
                ? "bg-cyan-500/20 text-cyan-400" 
                : "hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim() && !imagePreview && !audioBlob}
            className="p-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <SendIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;