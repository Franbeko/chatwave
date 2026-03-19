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
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      const uploadResponse = await cloudinary.uploader.upload(audio, {
        resource_type: "auto",
        folder: "voice_messages"
      });
      audioUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || '',
      image: imageUrl || '',
      audio: audioUrl || '',
      reactions: [],
      deletedForEveryone: false,
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

    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).sort({ createdAt: -1 });

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

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId && r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

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

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const deleteData = { 
      messageId: message._id, 
      forEveryone: false 
    };

    if (userId.toString() === message.senderId.toString()) {
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageDeleted', deleteData);
      }
    } else {
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messageDeleted', deleteData);
      }
    }

    res.json({ message: "Message deleted for you" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message for everyone" });
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const hours48 = 48 * 60 * 60 * 1000;
    
    if (messageAge > hours48) {
      return res.status(400).json({ message: "Can only delete messages within 48 hours" });
    }

    message.text = "This message was deleted";
    message.image = null;
    message.audio = null;
    message.deletedForEveryone = true;
    
    await message.save();

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const deleteData = { 
      messageId: message._id, 
      forEveryone: true 
    };

    if (senderSocketId) {
      io.to(senderSocketId).emit('messageDeleted', deleteData);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDeleted', deleteData);
    }

    res.json({ message: "Message deleted for everyone" });
  } catch (error) {
    console.error("Error in deleteForEveryone:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    console.log("Searching for:", q);

    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      deletedForEveryone: false
    })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('senderId', 'fullName profilePic')
    .populate('receiverId', 'fullName profilePic');

    console.log(`Found ${messages.length} total messages`);

    const searchTerm = q.toLowerCase();
    const filteredMessages = messages.filter(msg => 
      msg.text && msg.text.toLowerCase().includes(searchTerm)
    );

    console.log(`Found ${filteredMessages.length} matching messages`);

    res.status(200).json(filteredMessages);
  } catch (error) {
    console.error("Error in searchMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Save missed call message - ADD THIS AT THE END
export const saveMissedCall = async (req, res) => {
  try {
    const { callerId, receiverId, type, timestamp } = req.body;
    const userId = req.user._id;

    console.log("Saving missed call:", { callerId, receiverId, type, timestamp });

    // Create a system message for missed call
    const missedCallMessage = new Message({
      senderId: callerId,
      receiverId: receiverId,
      text: `📞 Missed ${type} call`,
      type: 'missed-call',
      callDetails: {
        type,
        timestamp,
        missed: true
      },
      createdAt: new Date(timestamp)
    });

    await missedCallMessage.save();

    // Emit socket event for real-time update
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', missedCallMessage);
    }

    res.status(201).json(missedCallMessage);
  } catch (error) {
    console.error("Error saving missed call:", error);
    res.status(500).json({ message: "Server error" });
  }
};