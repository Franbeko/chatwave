import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  groups: [], // Added
  activeTab: "chats",
  selectedUser: null,
  selectedGroup: null, // Added
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false, // Added
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  
  // Typing Indicator States
  typingUsers: {},
  starredMessages: JSON.parse(localStorage.getItem("starredMessages")) || [],
  replyTo: null,
  
  // Infinite Scroll States
  currentPage: 1,
  hasMoreMessages: true,
  isLoadingMore: false,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }), // Added

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch {
      toast.error("Failed to load chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Group functions
  getUserGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch {
      toast.error("Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getGroupMessages: async (groupId, page = 1) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages?page=${page}&limit=20`);
      set({ messages: res.data });
    } catch {
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    const { messages } = get();
    const { authUser } = useAuthStore.getState();

    if (!messageData.text?.trim() && !messageData.image && !messageData.audio) {
      toast.error("Cannot send empty message");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      groupId,
      text: messageData.text || '',
      image: messageData.image || '',
      audio: messageData.audio || '',
      reactions: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      const updatedMessages = messages.filter(msg => msg._id !== tempId);
      set({ messages: [...updatedMessages, res.data] });
    } catch {
      set({ messages });
      toast.error("Failed to send message");
    }
  },

  getMessagesByUserId: async (userId, page = 1, append = false) => {
    if (page === 1) {
      set({ isMessagesLoading: true });
    } else {
      set({ isLoadingMore: true });
    }
    
    try {
      const res = await axiosInstance.get(`/messages/${userId}?page=${page}&limit=20`);
      
      if (append) {
        set({ 
          messages: [...res.data, ...get().messages],
          currentPage: page,
          hasMoreMessages: res.data.length === 20,
          isLoadingMore: false
        });
      } else {
        set({ 
          messages: res.data,
          currentPage: 1,
          hasMoreMessages: res.data.length === 20,
          isMessagesLoading: false,
          isLoadingMore: false
        });
      }
    } catch {
      toast.error("Something went wrong");
      set({ isMessagesLoading: false, isLoadingMore: false });
    }
  },

  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages, isLoadingMore } = get();
    
    if (!selectedUser || !hasMoreMessages || isLoadingMore) return;
    
    const nextPage = currentPage + 1;
    await get().getMessagesByUserId(selectedUser._id, nextPage, true);
  },

  resetMessages: () => {
    set({ 
      messages: [], 
      currentPage: 1, 
      hasMoreMessages: true,
      isLoadingMore: false 
    });
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    if (!messageData.text?.trim() && !messageData.image && !messageData.audio) {
      toast.error("Cannot send empty message");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || '',
      image: messageData.image || '',
      audio: messageData.audio || '',
      replyTo: messageData.replyTo || null,
      reactions: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const updatedMessages = messages.filter(msg => msg._id !== tempId);
      set({ messages: [...updatedMessages, res.data] });
    } catch {
      set({ messages });
      toast.error("Failed to send message");
    }
  },

  replyToMessage: (messageId, replyData) => {
    const message = get().messages.find(msg => msg._id === messageId);
    if (message) {
      set({ replyTo: { message, replyData } });
      return { message, replyData };
    }
    return null;
  },

  forwardMessage: async (message) => {
    toast.success("Select a contact to forward this message");
    return message;
  },

  starMessage: (messageId) => {
    const { messages, starredMessages } = get();
    
    const updatedMessages = messages.map(msg => 
      msg._id === messageId ? { ...msg, starred: !msg.starred } : msg
    );
    
    let updatedStarred;
    if (starredMessages.includes(messageId)) {
      updatedStarred = starredMessages.filter(id => id !== messageId);
    } else {
      updatedStarred = [...starredMessages, messageId];
    }
    
    localStorage.setItem("starredMessages", JSON.stringify(updatedStarred));
    set({ messages: updatedMessages, starredMessages: updatedStarred });
  },

  reportMessage: async (messageId) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/report`);
      toast.success("Message reported to admins");
    } catch {
      toast.error("Failed to report message");
    }
  },

  addReaction: async (messageId, emoji) => {
    const { messages } = get();
    const { authUser } = useAuthStore.getState();
    
    const updatedMessages = messages.map(msg => {
      if (msg._id === messageId) {
        const existingReactions = msg.reactions || [];
        const userReactionIndex = existingReactions.findIndex(
          r => r.userId === authUser._id && r.emoji === emoji
        );

        let newReactions;
        if (userReactionIndex !== -1) {
          newReactions = existingReactions.filter((_, index) => index !== userReactionIndex);
        } else {
          newReactions = [...existingReactions, { userId: authUser._id, emoji }];
        }
        
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    
    set({ messages: updatedMessages });

    try {
      await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    } catch {
      set({ messages });
      toast.error("Failed to add reaction");
    }
  },

  // Delete for me (yourself only)
  deleteMessage: async (messageId) => {
    const { messages } = get();
    
    const updatedMessages = messages.filter(msg => msg._id !== messageId);
    set({ messages: updatedMessages });
    
    try {
      await axiosInstance.delete(`/messages/${messageId}?type=self`);
      toast.success("Message deleted");
    } catch {
      set({ messages });
      toast.error("Failed to delete message");
    }
  },

  // Delete for everyone (both users)
  deleteForEveryone: async (messageId) => {
    const { messages } = get();
    
    // Optimistic update - show "deleted" placeholder immediately
    const updatedMessages = messages.map(msg => 
      msg._id === messageId 
        ? { 
            ...msg, 
            text: "This message was deleted", 
            image: null, 
            audio: null,
            deletedForEveryone: true 
          } 
        : msg
    );
    
    set({ messages: updatedMessages });

    try {
      await axiosInstance.delete(`/messages/${messageId}/everyone`);
      toast.success("Message deleted for everyone");
    } catch {
      // Revert on error
      set({ messages });
      toast.error("Failed to delete for everyone");
    }
  },

  setTypingStatus: (userId, isTyping) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping
      }
    }));
  },

  emitTypingStatus: (isTyping) => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.emit("typing", {
        receiverId: selectedUser._id,
        isTyping
      });
    }
  },

  subscribeToTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("typing", ({ userId, isTyping }) => {
      if (userId === selectedUser._id) {
        set(state => ({
          typingUsers: {
            ...state.typingUsers,
            [userId]: isTyping
          }
        }));
      }
    });
  },

  unsubscribeFromTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("typing");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      
      const filteredMessages = currentMessages.filter(msg => 
        !(msg.isOptimistic && msg.senderId === newMessage.senderId && msg.text === newMessage.text)
      );
      
      set({messages: [...filteredMessages, newMessage]});

      set(state => ({
        typingUsers: {
          ...state.typingUsers,
          [selectedUser._id]: false
        }
      }));

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      const currentMessages = get().messages;
      const updatedMessages = currentMessages.map(msg => 
        msg._id === messageId ? { ...msg, reactions } : msg
      );
      set({ messages: updatedMessages });
    });

    socket.on("messageDeleted", ({ messageId, forEveryone }) => {
      const currentMessages = get().messages;
      let updatedMessages;
      
      if (forEveryone) {
        // For everyone deletion - show placeholder
        updatedMessages = currentMessages.map(msg => 
          msg._id === messageId 
            ? { 
                ...msg, 
                text: "This message was deleted", 
                image: null, 
                audio: null,
                deletedForEveryone: true 
              } 
            : msg
        );
      } else {
        // For self deletion - remove completely
        updatedMessages = currentMessages.filter(msg => msg._id !== messageId);
      }
      
      set({ messages: updatedMessages });
    });

    get().subscribeToTyping();
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageReaction");
      socket.off("messageDeleted");
    }
    get().unsubscribeFromTyping();
  },
}));