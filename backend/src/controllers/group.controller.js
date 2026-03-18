import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, profilePic, memberIds } = req.body;
    const creatorId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!memberIds || !memberIds.length) {
      return res.status(400).json({ message: "At least one member is required" });
    }

    // Create the group
    const group = new Group({
      name,
      description: description || '',
      profilePic: profilePic || '',
      createdBy: creatorId
    });

    await group.save();

    // Add creator as admin
    await GroupMember.create({
      groupId: group._id,
      userId: creatorId,
      role: "admin"
    });

    // Add other members
    const memberPromises = memberIds.map(userId => 
      GroupMember.create({
        groupId: group._id,
        userId,
        role: "member"
      })
    );

    await Promise.all(memberPromises);

    // Get populated group with members
    const populatedGroup = await Group.findById(group._id);
    const members = await GroupMember.find({ groupId: group._id })
      .populate('userId', 'fullName email profilePic');

    const groupData = {
      ...populatedGroup.toObject(),
      members: members.map(m => ({
        ...m.userId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt
      }))
    };

    res.status(201).json(groupData);
  } catch (error) {
    console.error("Error in createGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all groups for current user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all groups where user is a member
    const memberships = await GroupMember.find({ userId })
      .populate({
        path: 'groupId',
        populate: {
          path: 'createdBy',
          select: 'fullName'
        }
      });

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = membership.groupId;
        const memberCount = await GroupMember.countDocuments({ groupId: group._id });
        const lastMessage = await Message.findOne({ groupId: group._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'fullName');

        return {
          ...group.toObject(),
          memberCount,
          lastMessage: lastMessage || null,
          role: membership.role
        };
      })
    );

    res.json(groups);
  } catch (error) {
    console.error("Error in getUserGroups:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get group details
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is member
    const membership = await GroupMember.findOne({ groupId, userId });
    if (!membership) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const group = await Group.findById(groupId);
    const members = await GroupMember.find({ groupId })
      .populate('userId', 'fullName email profilePic')
      .sort({ role: -1, joinedAt: 1 });

    const groupData = {
      ...group.toObject(),
      members: members.map(m => ({
        ...m.userId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt
      })),
      userRole: membership.role
    };

    res.json(groupData);
  } catch (error) {
    console.error("Error in getGroupDetails:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image, audio } = req.body;
    const senderId = req.user._id;

    // Check if user is member
    const membership = await GroupMember.findOne({ groupId, userId: senderId });
    if (!membership) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    let imageUrl, audioUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    if (audio) {
      const uploadResponse = await cloudinary.uploader.upload(audio, {
        resource_type: "auto",
        folder: "voice_messages"
      });
      audioUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text: text || '',
      image: imageUrl || '',
      audio: audioUrl || '',
      reactions: [],
      deletedForEveryone: false,
    });

    await newMessage.save();

    // Get all group members for real-time delivery
    const members = await GroupMember.find({ groupId }).select('userId');
    
    // Emit to all members except sender
    members.forEach(member => {
      if (member.userId.toString() !== senderId.toString()) {
        const socketId = getReceiverSocketId(member.userId.toString());
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", {
            ...newMessage.toObject(),
            groupId
          });
        }
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // Check if user is member
    const membership = await GroupMember.findOne({ groupId, userId });
    if (!membership) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('senderId', 'fullName profilePic')
      .sort({ createdAt: 1 });

    res.json(messages.reverse());
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add member to group (admin only)
export const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const adminId = req.user._id;

    // Check if requester is admin
    const adminMembership = await GroupMember.findOne({ 
      groupId, 
      userId: adminId,
      role: "admin"
    });

    if (!adminMembership) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Check if user already in group
    const existing = await GroupMember.findOne({ groupId, userId: newMemberId });
    if (existing) {
      return res.status(400).json({ message: "User already in group" });
    }

    // Add new member
    await GroupMember.create({
      groupId,
      userId: newMemberId,
      role: "member"
    });

    // Get updated members list
    const members = await GroupMember.find({ groupId })
      .populate('userId', 'fullName email profilePic');

    res.json({ 
      message: "Member added successfully",
      members: members.map(m => ({
        ...m.userId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error) {
    console.error("Error in addGroupMember:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove member from group (admin only or self-leave)
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: memberId } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin or removing themselves
    const requesterMembership = await GroupMember.findOne({ 
      groupId, 
      userId: requesterId 
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // If removing someone else, must be admin
    if (memberId !== requesterId && requesterMembership.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove other members" });
    }

    // Cannot remove the creator if they're the only admin
    if (memberId === group.createdBy.toString()) {
      const adminCount = await GroupMember.countDocuments({ 
        groupId, 
        role: "admin" 
      });
      
      if (adminCount === 1) {
        return res.status(400).json({ 
          message: "Cannot remove the only admin. Make another member admin first." 
        });
      }
    }

    await GroupMember.deleteOne({ groupId, userId: memberId });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in removeGroupMember:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update group info (admin only)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, profilePic } = req.body;
    const userId = req.user._id;

    // Check if requester is admin
    const membership = await GroupMember.findOne({ 
      groupId, 
      userId,
      role: "admin"
    });

    if (!membership) {
      return res.status(403).json({ message: "Only admins can update group info" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (profilePic) group.profilePic = profilePic;

    await group.save();

    res.json(group);
  } catch (error) {
    console.error("Error in updateGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};