import React, { useState } from "react";
import { Search, X, MessageCircle } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";

function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { setSelectedUser } = useChatStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // Search for users instead of messages
      const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] pt-20">
      <div className="bg-slate-800 w-full max-w-2xl rounded-lg shadow-xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">Search Users</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for users..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
            />
          </div>
        </form>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 bg-slate-700/30 hover:bg-slate-700 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-200">{user.fullName}</h3>
                    <p className="text-xs text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                </button>
              ))}
            </div>
          ) : query && !isLoading ? (
            <p className="text-center text-slate-400 py-8">No users found for "{query}"</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;