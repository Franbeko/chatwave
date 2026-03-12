import { useRef, useState, useEffect } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon, MicIcon, SquareIcon, PlayIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioBlob) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
      audio: audioBlob,
    });
    
    // Reset all states
    setText("");
    setImagePreview("");
    setAudioBlob(null);
    setAudioPreview(null);
    setRecordingTime(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setAudioPreview(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioPreview(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) { // Max 60 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      toast.error("Microphone access denied or not available");
      console.error("Recording error:", error);
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
    if (!audioPreview) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioPreview);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
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
    <div className="p-4 border-t border-slate-700/50 relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full left-0 mb-2 z-50"
          style={{ maxWidth: '320px' }}
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            autoFocusSearch={false}
            theme="dark"
            skinTonesDisabled
            searchPlaceholder="Search emoji..."
            width="100%"
            height="400px"
            previewConfig={{
              showPreview: false
            }}
          />
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 transition-colors"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {audioPreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg">
          <button
            onClick={togglePlayAudio}
            className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          >
            {isPlaying ? <SquareIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
          </button>
          <div className="flex-1 h-1 bg-slate-700 rounded-full">
            <div className="h-1 bg-cyan-500 rounded-full w-0"></div>
          </div>
          <span className="text-xs text-slate-400">{formatTime(recordingTime)}</span>
          <button
            onClick={removeAudio}
            className="p-1 rounded-full hover:bg-slate-700"
          >
            <XIcon className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 bg-red-500/20 p-2 rounded-lg">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-400">Recording... {formatTime(recordingTime)}</span>
          <button
            onClick={stopRecording}
            className="ml-auto p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <SquareIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-lg transition-colors ${
            showEmojiPicker 
              ? "bg-cyan-500/20 text-cyan-400" 
              : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <SmileIcon className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            isSoundEnabled && playRandomKeyStrokeSound();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowEmojiPicker(false);
            }
          }}
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="Type your message..."
        />

        {/* Voice Recording Button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-lg transition-colors ${
            isRecording 
              ? "bg-red-500/20 text-red-400 animate-pulse" 
              : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <MicIcon className="w-5 h-5" />
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
          className={`p-2 rounded-lg transition-colors ${
            imagePreview 
              ? "bg-cyan-500/20 text-cyan-400" 
              : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview && !audioBlob}
          className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;