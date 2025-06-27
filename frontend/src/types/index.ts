export interface Meeting {
  id: string;
  title: string;
  agenda: string;
  scheduled_date: string;
  scheduled_time: string;
  created_at: string;
  updated_at: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  audio_file_path?: string;
  transcript?: string;
  executive_summary?: string;
  action_items?: string;
  meeting_outline?: string;
  word_count: number;
  duration_seconds: number;
  participants: Participant[];
  tags: string[];
  participant_count?: number;
}

export interface Participant {
  name: string;
  email?: string;
  role?: string;
}

export interface MeetingCreate {
  title: string;
  agenda: string;
  scheduled_date: string;
  scheduled_time: string;
  participants: Participant[];
  tags: string[];
}

export interface MeetingUpdate {
  title?: string;
  agenda?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status?: string;
  executive_summary?: string;
  action_items?: string;
  meeting_outline?: string;
  participants?: Participant[];
}

export interface AudioProcessingResult {
  transcript: string;
  executive_summary: string;
  action_items: string;
  meeting_outline: string;
  generated_at: string;
  word_count: number;
  analysis_depth: string;
  meeting_id: string;
  session_id: string;
  meeting_title: string;
}

export interface MeetingStats {
  totalMeetings: number;
  plannedMeetings: number;
  completedMeetings: number;
  totalHours: number;
}

export interface ProcessingProgress {
  step: number;
  message: string;
  title: string;
}