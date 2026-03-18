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

// Store online users
const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Get userId from handshake query
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} mapped to socket ${socket.id}`);
  }

  // Broadcast online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle call events
  socket.on("initiate-call", ({ callId, receiverId, callerId, callerName, callerPic, type }) => {
    console.log(`Call initiated: ${callId} from ${callerId} to ${receiverId}`);
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        callId,
        callerId,
        callerName,
        callerPic,
        type
      });
      console.log(`Incoming call event sent to ${receiverId}`);
    } else {
      console.log(`Receiver ${receiverId} is offline`);
    }
  });

  socket.on("accept-call", ({ callId, receiverId, callerId, receiverName }) => {
    console.log(`Call accepted: ${callId}`);
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", {
        callId,
        receiverId,
        receiverName
      });
    }
  });

  socket.on("reject-call", ({ callId, callerId }) => {
    console.log(`Call rejected: ${callId}`);
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected", {
        callId
      });
    }
  });

  socket.on("end-call", ({ callId, participants }) => {
    console.log(`Call ended: ${callId}`);
    participants?.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId);
      if (socketId) {
        io.to(socketId).emit("call-ended", { callId });
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Remove user from mapping
    for (const [userId, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
    // Update online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, io, server };