import { Meeting, MeetingCreate, MeetingUpdate, AudioProcessingResult } from '../types';

class ApiService {
  private baseUrl = '/api';

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Meeting endpoints
  async getMeetings(status?: string, limit = 50, offset = 0): Promise<{ meetings: Meeting[]; total: number }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    return this.get(`/meetings?${params.toString()}`);
  }

  async getMeeting(id: string): Promise<Meeting> {
    return this.get(`/meetings/${id}`);
  }

  async createMeeting(meeting: MeetingCreate): Promise<{ meeting_id: string; status: string }> {
    return this.post('/meetings', meeting);
  }

  async updateMeeting(id: string, data: MeetingUpdate): Promise<{ status: string; updated_fields: string[] }> {
    return this.put(`/meetings/${id}`, data);
  }

  async deleteMeeting(id: string): Promise<{ status: string }> {
    return this.delete(`/meetings/${id}`);
  }

  async searchMeetings(query: string): Promise<{ meetings: Meeting[]; total: number }> {
    return this.get(`/meetings/search/${encodeURIComponent(query)}`);
  }

  async processAudio(meetingId: string, file: File): Promise<AudioProcessingResult> {
    return this.uploadFile(`/meetings/${meetingId}/process-audio`, file);
  }

  async downloadMeetingNotes(meetingId: string, format = 'txt'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/download?format=${format}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  }

  async getHealthStatus(): Promise<{
    status: string;
    whisper_loaded: boolean;
    ollama_connected: boolean;
    timestamp: string;
  }> {
    const response = await fetch('/health');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();