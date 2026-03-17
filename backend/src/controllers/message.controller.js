import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image && !audio) {
      return res.status(400).json({ message: "Text, image, or audio is required." });
    }
    if (senderId.equals(receiverId)) {
      return res
        .status(400)
        .json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      // upload audio to cloudinary (if it's base64)
      if (audio.startsWith('data:')) {
        const uploadResponse = await cloudinary.uploader.upload(audio, {
          resource_type: "auto",
          folder: "voice_messages"
        });
        audioUrl = uploadResponse.secure_url;
      } else {
        audioUrl = audio; // Assume it's already a URL
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || '',
      image: imageUrl || '',
      audio: audioUrl || '',
      reactions: [],
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // find all the messages where the logged-in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

     const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId && r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Emit socket event for real-time update to both users
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const reactionData = {
      messageId: message._id,
      reactions: message.reactions
    };

    if (senderSocketId) {
      io.to(senderSocketId).emit('messageReaction', reactionData);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageReaction', reactionData);
    }

    res.json(message);
  } catch (error) {
    console.error("Error in addReaction:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user owns the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    // If message has image, delete from cloudinary
    if (message.image && message.image.includes('cloudinary')) {
      try {
        const publicId = message.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting image from cloudinary:", cloudinaryError);
      }
    }

    // If message has audio, delete from cloudinary
    if (message.audio && message.audio.includes('cloudinary')) {
      try {
        const publicId = message.audio.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      } catch (cloudinaryError) {
        console.error("Error deleting audio from cloudinary:", cloudinaryError);
      }
    }

    await message.deleteOne();

    // Emit socket event to both users
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const deleteData = { messageId: message._id };

    if (senderSocketId) {
      io.to(senderSocketId).emit('messageDeleted', deleteData);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDeleted', deleteData);
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};