export interface ChatMessage {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

export interface ChatSession {
  id: number;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}
