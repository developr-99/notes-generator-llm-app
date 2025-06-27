import React, { useState } from 'react';
import { Meeting, MeetingUpdate } from '../types';

interface MeetingHeaderProps {
  meeting: Meeting;
  onBackToHome: () => void;
  onMeetingUpdate: (data: MeetingUpdate) => void;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ meeting, onBackToHome, onMeetingUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    title: meeting.title,
    scheduled_date: meeting.scheduled_date,
    scheduled_time: meeting.scheduled_time,
    status: meeting.status,
  });

  const date = new Date(`${meeting.scheduled_date} ${meeting.scheduled_time}`);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  const statusText = meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1).replace('-', ' ');

  const startEdit = (field: string) => {
    setEditingField(field);
    setEditValues({
      title: meeting.title,
      scheduled_date: meeting.scheduled_date,
      scheduled_time: meeting.scheduled_time,
      status: meeting.status,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const saveField = async (field: string) => {
    try {
      if (field === 'title') {
        await onMeetingUpdate({ title: editValues.title });
      } else if (field === 'date') {
        await onMeetingUpdate({ scheduled_date: editValues.scheduled_date });
      } else if (field === 'time') {
        await onMeetingUpdate({ scheduled_time: editValues.scheduled_time });
      } else if (field === 'status') {
        await onMeetingUpdate({ status: editValues.status });
      }
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <header className="meeting-page-header">
      <button className="back-button" onClick={onBackToHome}>
        Back
      </button>
      <div className="header-container">
        <div className="meeting-header-content">
          {/* Editable Meeting Title */}
          <div className="title-section">
            {editingField === 'title' ? (
              <div className="edit-controls inline-edit">
                <input
                  type="text"
                  className="title-edit-input"
                  value={editValues.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  autoFocus
                  onBlur={() => saveField('title')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('title');
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
              </div>
            ) : (
              <h1 
                className="meeting-title editable-title"
                onClick={() => startEdit('title')}
                title="Click to edit title"
              >
                {meeting.title}
              </h1>
            )}
          </div>

          <div className="meeting-meta">
            {/* Editable Date */}
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              {editingField === 'date' ? (
                <input
                  type="date"
                  className="meta-edit-input"
                  value={editValues.scheduled_date}
                  onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                  onBlur={() => saveField('date')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('date');
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
              ) : (
                <span 
                  className="meta-value editable-meta"
                  onClick={() => startEdit('date')}
                  title="Click to edit date"
                >
                  {formattedDate}
                </span>
              )}
            </div>

            {/* Editable Time */}
            <div className="meta-item">
              <span className="meta-icon">🕐</span>
              {editingField === 'time' ? (
                <input
                  type="time"
                  className="meta-edit-input"
                  value={editValues.scheduled_time}
                  onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                  onBlur={() => saveField('time')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('time');
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
              ) : (
                <span 
                  className="meta-value editable-meta"
                  onClick={() => startEdit('time')}
                  title="Click to edit time"
                >
                  {formattedTime}
                </span>
              )}
            </div>

            {/* Editable Status */}
            <div className="meta-item">
              <span className="meta-icon">📊</span>
              {editingField === 'status' ? (
                <select
                  className="status-edit-select"
                  value={editValues.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  onBlur={() => saveField('status')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('status');
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <span 
                  className={`status-badge status-${meeting.status} editable-status`}
                  onClick={() => startEdit('status')}
                  title="Click to edit status"
                >
                  {statusText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};