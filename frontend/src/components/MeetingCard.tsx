import React from 'react';
import { Meeting } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onClick, onEdit, onDelete }) => {
  const date = new Date(`${meeting.scheduled_date} ${meeting.scheduled_time}`);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const statusClass = `status-${meeting.status}`;
  const statusText = meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1).replace('-', ' ');

  const hasNotes = meeting.transcript && meeting.transcript.trim().length > 0;
  const notesIcon = hasNotes ? '📝' : '⏳';
  const notesText = hasNotes ? 'Has notes' : 'No recording yet';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="meeting-card" onClick={onClick}>
      <div className="meeting-card-content">
        <div className="meeting-header">
          <div className="meeting-info">
            <div className="meeting-title">{meeting.title}</div>
            <div className="meeting-datetime">
              <span className="meeting-date">{formattedDate}</span>
              <span className="meeting-time">{formattedTime}</span>
            </div>
          </div>
          <div className="meeting-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn-icon" 
              onClick={handleEdit}
              title="Edit"
            >
              ✏️
            </button>
            <span className={`meeting-status ${statusClass}`}>{statusText}</span>
          </div>
        </div>

        {meeting.agenda && (
          <div className="meeting-agenda">{meeting.agenda}</div>
        )}
      </div>

      <div className="meeting-meta">
        <span className="meeting-notes-status">{notesIcon} {notesText}</span>
        <span className="meeting-participants">
          {meeting.participant_count || meeting.participants?.length || 0} participant
          {(meeting.participant_count || meeting.participants?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};