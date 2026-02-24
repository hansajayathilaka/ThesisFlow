export interface StoredFile {
  name: string;
  type: string;
  data: string;
  blob: Blob;
  description?: string;
}

export interface LLMInteraction {
  id: string;
  timestamp: string;
  type: 'refine' | 'edit' | 'chat';
  request: any;
  response: any;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
  line: number;
}
