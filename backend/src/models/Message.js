import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    audio: {
      type: String,
      default: '',
    },
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    deletedForEveryone: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'missed-call', 'call-ended'],
      default: 'text'
    },
    callDetails: {
      type: {
        type: String,
        enum: ['audio', 'video']
      },
      timestamp: Date,
      duration: Number,
      missed: Boolean
    },
  },
  { timestamps: true }
);

// Add indexes
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ text: 'text' });

const Message = mongoose.model("Message", messageSchema);
export default Message;