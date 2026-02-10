import ChatThread from "@/components/chat/ChatThread";

export default function HelpdeskChatView({
  conversationId,
}: {
  conversationId: number;
}) {
  return <ChatThread conversationId={conversationId} showHelpdeskControls />;
}
