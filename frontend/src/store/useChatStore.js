import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
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

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      set({ isUsersLoading: false });
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
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
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

    // Check if there's content to send
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
    } catch (error) {
      set({ messages });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Fixed: Now properly using the parameters
  replyToMessage: (messageId, replyData) => {
    // Store the reply information in the store if needed
    const message = get().messages.find(msg => msg._id === messageId);
    if (message) {
      // You can store the reply context or just return the message
      set({ replyTo: { message, replyData } });
      return { message, replyData };
    }
    return null;
  },

  forwardMessage: async (message) => {
    // This would open a modal to select user
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
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to report message");
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
    } catch (error) {
      set({ messages });
      toast.error(error.response?.data?.message || "Failed to add reaction");
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    
    const updatedMessages = messages.filter(msg => msg._id !== messageId);
    set({ messages: updatedMessages });
    
    try {
      await axiosInstance.delete(`/messages/${messageId}?type=self`);
      toast.success("Message deleted");
    } catch (error) {
      set({ messages });
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  deleteForEveryone: async (messageId) => {
    const { messages } = get();
    
    const updatedMessages = messages.map(msg => 
      msg._id === messageId ? { ...msg, text: "This message was deleted", deletedForEveryone: true, image: null, audio: null } : msg
    );
    set({ messages: updatedMessages });
    
    try {
      await axiosInstance.delete(`/messages/${messageId}?type=everyone`);
      toast.success("Message deleted for everyone");
    } catch (error) {
      set({ messages });
      toast.error(error.response?.data?.message || "Failed to delete for everyone");
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
        updatedMessages = currentMessages.map(msg => 
          msg._id === messageId ? { ...msg, text: "This message was deleted", deletedForEveryone: true, image: null, audio: null } : msg
        );
      } else {
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