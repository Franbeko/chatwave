import { useChatStore } from "../store/useChatStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex p-1 gap-1 border-b border-slate-700/50">
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
          activeTab === "chats"
            ? "bg-cyan-500/20 text-cyan-400"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        }`}
      >
        Chats
      </button>
      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
          activeTab === "contacts"
            ? "bg-cyan-500/20 text-cyan-400"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        }`}
      >
        Contacts
      </button>
    </div>
  );
}

export default ActiveTabSwitch;