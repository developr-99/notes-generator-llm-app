import React, { useState } from 'react';
import { Meeting, MeetingUpdate, Participant } from '../types';

interface MeetingInfoProps {
  meeting: Meeting;
  onMeetingUpdate: (data: MeetingUpdate) => void;
}

export const MeetingInfo: React.FC<MeetingInfoProps> = ({ meeting, onMeetingUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    agenda: meeting.agenda,
    participants: meeting.participants || [],
  });

  const startEdit = (field: string) => {
    setEditingField(field);
    setEditValues({
      agenda: meeting.agenda,
      participants: meeting.participants || [],
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const saveField = async (field: string) => {
    try {
      if (field === 'agenda') {
        await onMeetingUpdate({ agenda: editValues.agenda });
      } else if (field === 'participants') {
        await onMeetingUpdate({ participants: editValues.participants });
      }
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const addParticipant = () => {
    setEditValues(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', email: '', role: '' }]
    }));
  };

  const removeParticipant = (index: number) => {
    setEditValues(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    setEditValues(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  return (
    <section className="meeting-info-section">
      <div className="info-card">
        <div className="card-header">
          <h3>📋 Agenda</h3>
          <button 
            className="btn-edit-small" 
            onClick={() => startEdit('agenda')}
            aria-label="Edit agenda"
          >
            ✏️
          </button>
        </div>

        <div className="editable-field">
          {editingField === 'agenda' ? (
            <div className="edit-controls">
              <textarea
                className="edit-textarea"
                rows={4}
                placeholder="Meeting agenda, topics to discuss..."
                value={editValues.agenda}
                onChange={(e) => setEditValues(prev => ({ ...prev, agenda: e.target.value }))}
              />
              <div className="edit-buttons">
                <button className="btn-save" onClick={() => saveField('agenda')}>✓ Save</button>
                <button className="btn-cancel" onClick={cancelEdit}>✗ Cancel</button>
              </div>
            </div>
          ) : (
            <div className="agenda-content editable-text" onClick={() => startEdit('agenda')}>
              {meeting.agenda || 'No agenda specified'}
            </div>
          )}
        </div>
      </div>

      <div className="info-card">
        <div className="card-header">
          <h3>👥 Participants</h3>
          <button 
            className="btn-edit-small" 
            onClick={() => startEdit('participants')}
            title="Edit Participants"
            aria-label="Edit participants"
          >
            ✏️
          </button>
        </div>

        <div className="editable-field">
          {editingField === 'participants' ? (
            <div className="edit-controls">
              <div className="participants-editor">
                {editValues.participants.map((participant, index) => (
                  <div key={index} className="participant-input-group">
                    <input
                      type="text"
                      placeholder="Name *"
                      className="participant-name"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      className="participant-email"
                      value={participant.email || ''}
                      onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Role (optional)"
                      className="participant-role"
                      value={participant.role || ''}
                      onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-remove-participant"
                      onClick={() => removeParticipant(index)}
                      aria-label="Remove this participant"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-small" 
                onClick={addParticipant}
                aria-label="Add new participant"
              >
                + Add Participant
              </button>
              <div className="edit-buttons">
                <button className="btn-save" onClick={() => saveField('participants')}>✓ Save</button>
                <button className="btn-cancel" onClick={cancelEdit}>✗ Cancel</button>
              </div>
            </div>
          ) : (
            <div className="participants-list editable-text" onClick={() => startEdit('participants')}>
              {meeting.participants && meeting.participants.length > 0 ? (
                meeting.participants.map((participant, index) => (
                  <div key={index} className="participant">
                    {participant.name}{participant.role ? ` (${participant.role})` : ''}
                  </div>
                ))
              ) : (
                'No participants added'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audio File Info (if exists) */}
      {meeting.audio_file_path && (
        <div className="info-card">
          <h3>🎵 Audio File</h3>
          <div className="audio-file-info">
            <p><strong>File:</strong> {meeting.audio_file_path.split('/').pop()}</p>
            <p><strong>Location:</strong> <code>{meeting.audio_file_path}</code></p>
          </div>
        </div>
      )}
    </section>
  );
};