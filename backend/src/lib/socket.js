import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Store online users with their socket IDs
const userSocketMap = new Map(); // { userId: socketId }
// Store user details for online status
const onlineUsers = new Set(); // { userId }

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap.get(receiverId);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers);
};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Get userId from handshake query
  const userId = socket.handshake.query.userId;
  
  if (userId) {
    // Store user connection
    userSocketMap.set(userId, socket.id);
    onlineUsers.add(userId);
    
    // Store userId on socket for easy reference
    socket.userId = userId;
    
    console.log(`📱 User ${userId} is now online`);
    console.log(`👥 Online users:`, Array.from(onlineUsers));
  }

  // Broadcast online users to all connected clients
  io.emit("getOnlineUsers", Array.from(onlineUsers));

  // Handle call events
  socket.on("initiate-call", ({ callId, receiverId, callerId, callerName, callerPic, type }) => {
    console.log(`📞 Call initiated: ${callId} from ${callerId} to ${receiverId}`);
    
    const receiverSocketId = userSocketMap.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        callId,
        callerId,
        callerName,
        callerPic,
        type,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Incoming call event sent to ${receiverId}`);
    } else {
      console.log(`❌ Receiver ${receiverId} is offline - call missed`);
      
      // Notify caller that receiver is offline
      const callerSocketId = userSocketMap.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-failed", {
          callId,
          reason: "User is offline"
        });
      }
      
      // Save missed call message to database (will implement in controller)
      socket.emit("save-missed-call", {
        callerId,
        receiverId,
        type,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("accept-call", ({ callId, receiverId, callerId, receiverName }) => {
    console.log(`✅ Call accepted: ${callId}`);
    const callerSocketId = userSocketMap.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", {
        callId,
        receiverId,
        receiverName,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("reject-call", ({ callId, callerId }) => {
    console.log(`❌ Call rejected: ${callId}`);
    const callerSocketId = userSocketMap.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected", {
        callId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("end-call", ({ callId, participants, duration }) => {
    console.log(`📴 Call ended: ${callId} (duration: ${duration}s)`);
    participants?.forEach(participantId => {
      const socketId = userSocketMap.get(participantId);
      if (socketId && socketId !== socket.id) {
        io.to(socketId).emit("call-ended", { 
          callId, 
          duration,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  socket.on("missed-call", ({ callId, callerId, receiverId, type }) => {
    console.log(`📵 Missed call: ${callId}`);
    
    // Notify caller that call was missed
    const callerSocketId = userSocketMap.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-missed", {
        callId,
        receiverId,
        type,
        timestamp: new Date().toISOString()
      });
    }
    
    // Notify receiver that they missed a call
    const receiverSocketId = userSocketMap.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("you-missed-call", {
        callId,
        callerId,
        type,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    
    // Remove user from online tracking
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      userSocketMap.delete(socket.userId);
      console.log(`📱 User ${socket.userId} is now offline`);
    }
    
    console.log(`👥 Online users:`, Array.from(onlineUsers));
    
    // Broadcast updated online users
    io.emit("getOnlineUsers", Array.from(onlineUsers));
  });
});

export { app, io, server };