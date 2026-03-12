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
      toast.error(error.response.data.message);
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
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Updated with pagination
  getMessagesByUserId: async (userId, page = 1, append = false) => {
    if (page === 1) {
      set({ isMessagesLoading: true });
    } else {
      set({ isLoadingMore: true });
    }
    
    try {
      const res = await axiosInstance.get(`/messages/${userId}?page=${page}&limit=20`);
      
      if (append) {
        // Append older messages to the beginning
        set({ 
          messages: [...res.data, ...get().messages],
          currentPage: page,
          hasMoreMessages: res.data.length === 20,
          isLoadingMore: false
        });
      } else {
        // First page - replace messages
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

  // Load more messages (for infinite scroll)
  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages, isLoadingMore } = get();
    
    if (!selectedUser || !hasMoreMessages || isLoadingMore) return;
    
    const nextPage = currentPage + 1;
    await get().getMessagesByUserId(selectedUser._id, nextPage, true);
  },

  // Reset messages when switching users
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

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      audio: messageData.audio, // Add audio support
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    
    // Immediately update the UI
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // Replace optimistic message with real one
      set({ messages: messages.concat(res.data) });
    } catch (error) {
      // Remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
       const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
       if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      set({messages:[...currentMessages, newMessage]});

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    })
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
}));