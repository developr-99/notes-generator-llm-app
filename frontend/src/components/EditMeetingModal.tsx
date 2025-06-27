import React, { useState } from 'react';
import { Meeting, MeetingUpdate } from '../types';
import { apiService } from '../services/api';

interface EditMeetingModalProps {
  meeting: Meeting;
  onClose: () => void;
  onMeetingUpdated: () => void;
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({ meeting, onClose, onMeetingUpdated }) => {
  const [formData, setFormData] = useState<MeetingUpdate>({
    title: meeting.title,
    agenda: meeting.agenda,
    scheduled_date: meeting.scheduled_date,
    scheduled_time: meeting.scheduled_time,
    status: meeting.status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      setError('Meeting title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiService.updateMeeting(meeting.id, formData);
      onMeetingUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteMeeting(meeting.id);
      onMeetingUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meeting');
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
          <h2>📝 Edit Meeting</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="edit-title">Meeting Title *</label>
            <input
              type="text"
              id="edit-title"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-agenda">Agenda</label>
            <textarea
              id="edit-agenda"
              name="agenda"
              rows={4}
              value={formData.agenda}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-date">Date *</label>
              <input
                type="date"
                id="edit-date"
                name="scheduled_date"
                required
                value={formData.scheduled_date}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-time">Time *</label>
              <input
                type="time"
                id="edit-time"
                name="scheduled_time"
                required
                value={formData.scheduled_time}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </form>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};