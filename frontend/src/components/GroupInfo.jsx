import React, { useState, useEffect } from "react";
import { X, Users, Camera, LogOut, UserMinus, Shield, Edit3 } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

function GroupInfo({ groupId, isOpen, onClose }) {
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { authUser } = useAuthStore();
  const { setSelectedUser } = useChatStore();

  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupInfo();
      loadContacts();
    }
  }, [isOpen, groupId]);

  const loadGroupInfo = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/groups/${groupId}`);
      setGroup(res.data);
      setEditedName(res.data.name);
      setEditedDescription(res.data.description || "");
    } catch {
      toast.error("Failed to load group info");
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await axiosInstance.get("/messages/contacts");
      setContacts(res.data);
    } catch {
      console.error("Failed to load contacts");
    }
  };

  const handleUpdateGroup = async () => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, {
        name: editedName,
        description: editedDescription
      });
      setGroup(res.data);
      setIsEditing(false);
      toast.success("Group updated");
    } catch {
      toast.error("Failed to update group");
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, {
        userId
      });
      setGroup(prev => ({
        ...prev,
        members: res.data.members
      }));
      toast.success("Member added");
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from group?")) return;

    try {
      await axiosInstance.delete(`/groups/${groupId}/members`, {
        data: { userId }
      });
      setGroup(prev => ({
        ...prev,
        members: prev.members.filter(m => m._id !== userId)
      }));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;

    try {
      await axiosInstance.delete(`/groups/${groupId}/members`, {
        data: { userId: authUser._id }
      });
      toast.success("Left group");
      onClose();
      setSelectedUser(null);
    } catch {
      toast.error("Failed to leave group");
    }
  };

  const isAdmin = group?.members?.find(
    m => m._id === authUser._id
  )?.role === "admin";

  const filteredContacts = contacts.filter(contact =>
    !group?.members?.some(m => m._id === contact._id) &&
    (contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-slate-800 w-full max-w-md rounded-lg shadow-xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-200">Group Info</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : group ? (
          <div className="p-4">
            {/* Group Photo & Name */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-700 overflow-hidden mb-3">
                <img
                  src={group.profilePic || "/group-avatar.png"}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {isEditing ? (
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                  />
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows="2"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateGroup}
                      className="flex-1 bg-cyan-600 text-white py-1 rounded-lg text-sm hover:bg-cyan-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-slate-700 text-slate-200 py-1 rounded-lg text-sm hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-slate-200">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-400 text-center mt-1">{group.description}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Created by {group.createdBy?.fullName}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Info
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Members Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Members ({group.members?.length || 0})
                </h4>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMembers(!showAddMembers)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    + Add
                  </button>
                )}
              </div>

              {/* Add Members UI */}
              {showAddMembers && isAdmin && (
                <div className="mb-3 p-3 bg-slate-700/30 rounded-lg">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-200"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact._id}
                        onClick={() => handleAddMember(contact._id)}
                        className="w-full flex items-center gap-2 p-1 hover:bg-slate-600/50 rounded"
                      >
                        <img
                          src={contact.profilePic || "/avatar.png"}
                          alt={contact.fullName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm text-slate-200">{contact.fullName}</span>
                      </button>
                    ))}
                    {filteredContacts.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        No contacts to add
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {group.members?.map(member => {
                  const isCurrentUser = member._id === authUser._id;
                  const isMemberAdmin = member.role === "admin";
                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={member.profilePic || "/avatar.png"}
                          alt={member.fullName}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="text-sm text-slate-200 flex items-center gap-1">
                            {member.fullName}
                            {isMemberAdmin && (
                              <Shield className="w-3 h-3 text-cyan-400" />
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </div>

                      {isAdmin && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          title="Remove from group"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Group Button */}
            <button
              onClick={handleLeaveGroup}
              className="w-full mt-4 bg-red-500/20 text-red-400 py-2 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default GroupInfo;