import React, { useState } from 'react';
import { MeetingCreate, Participant } from '../types';
import { apiService } from '../services/api';

interface NewMeetingModalProps {
  onClose: () => void;
  onMeetingCreated: (meetingId: string) => void;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({ onClose, onMeetingCreated }) => {
  const [formData, setFormData] = useState<MeetingCreate>({
    title: '',
    agenda: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: new Date().toTimeString().slice(0, 5),
    participants: [{ name: '', email: '', role: '' }],
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...formData.participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setFormData(prev => ({ ...prev, participants: newParticipants }));
  };

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', email: '', role: '' }]
    }));
  };

  const removeParticipant = (index: number) => {
    if (formData.participants.length > 1) {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Filter out empty participants
      const participants = formData.participants.filter(p => p.name.trim());

      const meetingData = {
        ...formData,
        participants,
      };

      const result = await apiService.createMeeting(meetingData);
      onMeetingCreated(result.meeting_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal show" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>📅 Create New Meeting</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="title">Meeting Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              placeholder="e.g., Weekly Team Standup, Client Review, Project Planning"
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="agenda">Agenda</label>
            <textarea
              id="agenda"
              name="agenda"
              rows={4}
              placeholder="Meeting agenda, topics to discuss, objectives..."
              value={formData.agenda}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduled_date">Date *</label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                required
                value={formData.scheduled_date}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="scheduled_time">Time *</label>
              <input
                type="time"
                id="scheduled_time"
                name="scheduled_time"
                required
                value={formData.scheduled_time}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Participants (Optional)</label>
            <div className="participants-container">
              {formData.participants.map((participant, index) => (
                <div key={index} className="participant-input-group">
                  <input
                    type="text"
                    placeholder="Name"
                    className="participant-name"
                    value={participant.name}
                    onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    className="participant-email"
                    value={participant.email}
                    onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Role"
                    className="participant-role"
                    value={participant.role}
                    onChange={(e) => handleParticipantChange(index, 'role', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-remove-participant"
                    onClick={() => removeParticipant(index)}
                    disabled={formData.participants.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-small" onClick={addParticipant}>
              + Add Participant
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (Optional)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="team, project, review, planning (comma-separated)"
              onChange={handleTagsChange}
            />
            <small>Use tags to categorize and find meetings easily</small>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            form="newMeetingForm" 
            className="btn btn-primary"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Creating...' : 'Create Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
};