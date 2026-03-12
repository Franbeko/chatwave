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
    <div className="relative w-full max-w-6xl h-screen mx-auto">
      <BorderAnimatedContainer>

        <div className="flex h-full">

          {/* LEFT SIDE */}
          <div className="w-72 md:w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">

            <ProfileHeader />

            <ActiveTabSwitch />

            {/* Scrollable chat list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === "chats" ? <ChatsList /> : <ContactList />}
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">

            {selectedUser ? (
              <ChatContainer />
            ) : (
              <NoConversationPlaceholder />
            )}

          </div>

        </div>

      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;