import AppLayout from '@/components/AppLayout';
import ChatWorkspace from './components/ChatWorkspace';

export default function AIChatPage() {
  return (
    <AppLayout activeRoute="/ai-chat-interface">
      <ChatWorkspace />
    </AppLayout>
  );
}