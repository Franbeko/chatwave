import React, { useState, useEffect } from "react";
import { X, Search, Users, Camera } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

function CreateGroupModal({ isOpen, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPic, setGroupPic] = useState(null);
  const [groupPicPreview, setGroupPicPreview] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuthStore(); // This is fine now - the store exists

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      const res = await axiosInstance.get("/messages/contacts");
      setContacts(res.data);
    } catch {
      toast.error("Failed to load contacts");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupPic(file);
      const reader = new FileReader();
      reader.onloadend = () => setGroupPicPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (contact) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m._id === contact._id);
      if (isSelected) {
        return prev.filter(m => m._id !== contact._id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Select at least one member");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", groupName);
      formData.append("description", groupDescription);
      if (groupPic) {
        formData.append("profilePic", groupPic);
      }
      formData.append("memberIds", JSON.stringify(selectedMembers.map(m => m._id)));

      const res = await axiosInstance.post("/groups", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Group created successfully!");
      onCreate(res.data);
      resetForm();
      onClose();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setGroupName("");
    setGroupDescription("");
    setGroupPic(null);
    setGroupPicPreview(null);
    setSelectedMembers([]);
    setSearchQuery("");
  };

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-slate-800 w-full max-w-md rounded-lg shadow-xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">
            {step === 1 ? "Create New Group" : "Add Members"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step 1: Group Info */}
        {step === 1 && (
          <div className="p-4">
            {/* Group Photo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-700 overflow-hidden">
                  {groupPicPreview ? (
                    <img src={groupPicPreview} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-1 bg-cyan-600 rounded-full cursor-pointer hover:bg-cyan-700">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Group Name */}
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Family, Friends, Work"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Group Description */}
            <div className="mb-6">
              <label className="block text-sm text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                rows="3"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep(2)}
              disabled={!groupName.trim()}
              className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Add Members */}
        {step === 2 && (
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Selected Count */}
            <div className="text-sm text-slate-400 mb-2">
              Selected: {selectedMembers.length} members
            </div>

            {/* Contacts List */}
            <div className="max-h-60 overflow-y-auto mb-4 space-y-2">
              {filteredContacts.map(contact => {
                const isSelected = selectedMembers.some(m => m._id === contact._id);
                return (
                  <button
                    key={contact._id}
                    onClick={() => toggleMember(contact)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-cyan-600/20' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <img
                      src={contact.profilePic || "/avatar.png"}
                      alt={contact.fullName}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <h3 className="text-sm font-medium text-slate-200">{contact.fullName}</h3>
                      <p className="text-xs text-slate-400">{contact.email}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredContacts.length === 0 && (
                <p className="text-center text-slate-400 py-4">No contacts found</p>
              )}
            </div>

            {/* Create Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-700 text-slate-200 py-2 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={selectedMembers.length === 0 || isLoading}
                className="flex-1 bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateGroupModal;