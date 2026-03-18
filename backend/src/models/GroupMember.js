import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "member"],
    default: "member"
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure a user can only be in a group once
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

const GroupMember = mongoose.model("GroupMember", groupMemberSchema);
export default GroupMember;