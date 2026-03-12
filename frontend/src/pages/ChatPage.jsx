import { useChatStore } from "../store/useChatStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <div className="relative w-full max-w-6xl h-[90vh] flex flex-col">
      <BorderAnimatedContainer className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT SIDE (SIDEBAR) */}
        <div
          className={`
          ${selectedUser ? "hidden md:flex" : "flex"}
          flex-col w-full md:w-80 bg-slate-800/50 backdrop-blur-sm h-full
          `}
        >
          <ProfileHeader />
          <ActiveTabSwitch />

          {/* Scrollable Lists Container - FIXED HEIGHT ISSUE */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 space-y-2">
              {activeTab === "chats" ? <ChatsList /> : <ContactList />}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (CHAT AREA) */}
        <div
          className={`
          ${!selectedUser ? "hidden md:flex" : "flex"}
          flex-1 flex-col bg-slate-900/50 backdrop-blur-sm h-full min-h-0
          `}
        >
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;