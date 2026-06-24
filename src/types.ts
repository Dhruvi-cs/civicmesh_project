export interface TicketUpdate {
  description: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  category: string; // Pothole, Water Leakage, Broken Streetlight, Waste Management
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  validation_count: number;
  status: 'Open' | 'Resolved';
  createdAt: string;
  updates: TicketUpdate[];
}

export interface PipelineResult {
  flagged: boolean;
  distanceMeters: number | null;
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
  usedMultimodal: boolean;
}

export interface SubmissionResponse {
  event: 'MERGED' | 'CREATED';
  message: string;
  ticket: Ticket;
  verification: PipelineResult;
}
