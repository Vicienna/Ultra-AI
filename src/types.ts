
export type ModelId = 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview' | 'gemini-3.1-flash-lite-preview';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: ModelId;
  timestamp: number;
  thinking?: string;
  groundingMetadata?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  userId: string;
  mode: ChatMode;
}

export type ChatMode = 'fast' | 'programmer_mini' | 'programmer_complex' | 'creative' | 'researcher' | 'file_generator';

export interface UserSettings {
  apiKey?: string;
  theme: 'light' | 'dark';
  discussionEnabled: boolean;
}
