export interface AIModel {
  id: string;
  name: string;
  provider: string;
  color: string;
  badge: string | null;
}

export interface MessageFile {
  name: string;
  size: number;
  type: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  files?: MessageFile[];
}

export interface Conversation {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  modelId: string;
  fileCount: number;
}

export interface Project {
  id: string;
  name: string;
  conversationCount: number;
  color: string;
}