import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      // Connect socket after auth is confirmed
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully! Welcome to ChatWave 🎉");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });

    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Welcome back! You're now logged in. 🎉");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      // Disconnect socket before logout
      get().disconnectSocket();
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
    } catch (error) {
      console.log("logout error:", error);
      toast.error("Error logging out");
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    
    // Don't connect if no user or socket already connected
    if (!authUser || socket?.connected) {
      console.log("Socket already connected or no user");
      return;
    }

    console.log("Connecting socket for user:", authUser._id);
    
    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
      transports: ['websocket', 'polling'], // Ensure websocket connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected successfully:", newSocket.id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      console.log("👥 Online users received:", userIds);
      set({ onlineUsers: userIds });
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      console.log("Disconnecting socket...");
      socket.disconnect();
      set({ socket: null });
    }
  },
}));