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

export interface AgentChatMessage {
  id: string;
  sender: 'client' | 'agent';
  content: string;
  time: string;
}

export interface AgentContact {
  id: string;
  name: string;
  avatarLetter: string;
  propertyCode: string;
  propertyName: string;
  propertyPrice: string;
  lastMessageSnippet: string;
  lastMessageTime: string;
  messages: AgentChatMessage[];
}
