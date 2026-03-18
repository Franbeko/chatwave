import { getReceiverSocketId, io } from "../lib/socket.js";

// Store active calls
const activeCalls = new Map(); // callId -> { participants, type, startTime }

export const initiateCall = async (req, res) => {
  try {
    const { receiverId, type } = req.body; // type: 'audio' or 'video'
    const callerId = req.user._id;

    if (!receiverId || !type) {
      return res.status(400).json({ message: "Receiver ID and call type are required" });
    }

    const callId = `${callerId}-${receiverId}-${Date.now()}`;

    // Store call info
    activeCalls.set(callId, {
      id: callId,
      callerId,
      receiverId,
      type,
      status: 'ringing',
      startTime: null,
      participants: [callerId]
    });

    // Notify receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incomingCall', {
        callId,
        callerId,
        callerName: req.user.fullName,
        callerPic: req.user.profilePic,
        type
      });
    }

    res.json({ 
      callId,
      message: "Call initiated",
      call: activeCalls.get(callId)
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    call.status = 'connected';
    call.startTime = Date.now();
    call.participants.push(userId);
    activeCalls.set(callId, call);

    // Notify caller that call was accepted
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callAccepted', {
        callId,
        receiverId: userId,
        receiverName: req.user.fullName
      });
    }

    res.json({ message: "Call accepted", call });
  } catch (error) {
    console.error("Error accepting call:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    call.status = 'rejected';
    activeCalls.set(callId, call);

    // Notify caller
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callRejected', {
        callId,
        reason: 'rejected'
      });
    }

    // Clean up after 5 seconds
    setTimeout(() => {
      activeCalls.delete(callId);
    }, 5000);

    res.json({ message: "Call rejected" });
  } catch (error) {
    console.error("Error rejecting call:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Calculate call duration
    const duration = call.startTime ? Math.floor((Date.now() - call.startTime) / 1000) : 0;

    // Notify all participants
    call.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) {
        io.to(socketId).emit('callEnded', { callId, duration });
      }
    });

    // Clean up
    activeCalls.delete(callId);

    res.json({ message: "Call ended", duration });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const call = activeCalls.get(callId);
    
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    res.json({ call });
  } catch (error) {
    console.error("Error getting call status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Group call functions
export const initiateGroupCall = async (req, res) => {
  try {
    const { groupId, type } = req.body; // type: 'audio' or 'video'
    const callerId = req.user._id;

    if (!groupId || !type) {
      return res.status(400).json({ message: "Group ID and call type are required" });
    }

    // Get all group members (you'll need to import GroupMember model)
    const GroupMember = (await import("../models/GroupMember.js")).default;
    const members = await GroupMember.find({ groupId }).populate('userId', 'fullName profilePic');
    
    const callId = `group-${groupId}-${Date.now()}`;

    const groupCall = {
      id: callId,
      groupId,
      callerId,
      type,
      status: 'ringing',
      startTime: null,
      participants: [callerId],
      memberList: members.map(m => ({
        id: m.userId._id,
        name: m.userId.fullName,
        pic: m.userId.profilePic,
        role: m.role
      }))
    };

    activeCalls.set(callId, groupCall);

    // Notify all group members except caller
    members.forEach(member => {
      if (member.userId._id.toString() !== callerId.toString()) {
        const socketId = getReceiverSocketId(member.userId._id.toString());
        if (socketId) {
          io.to(socketId).emit('incomingGroupCall', {
            callId,
            groupId,
            callerId,
            callerName: req.user.fullName,
            type,
            groupName: groupCall.groupName
          });
        }
      }
    });

    res.json({ 
      callId,
      message: "Group call initiated",
      call: groupCall
    });
  } catch (error) {
    console.error("Error initiating group call:", error);
    res.status(500).json({ message: "Server error" });
  }
};