import React, { useState } from 'react';
import { Meeting, MeetingUpdate } from '../types';

interface MeetingResultsProps {
  meeting: Meeting;
  onDownload: (format: 'txt' | 'json') => void;
  onMeetingUpdate: (data: MeetingUpdate) => void;
}

export const MeetingResults: React.FC<MeetingResultsProps> = ({ meeting, onDownload, onMeetingUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    executive_summary: meeting.executive_summary || '',
    action_items: meeting.action_items || '',
    meeting_outline: meeting.meeting_outline || '',
  });

  const startEdit = (field: string) => {
    setEditingField(field);
    setEditValues({
      executive_summary: meeting.executive_summary || '',
      action_items: meeting.action_items || '',
      meeting_outline: meeting.meeting_outline || '',
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const saveField = async (field: string) => {
    try {
      if (field === 'summary') {
        await onMeetingUpdate({ executive_summary: editValues.executive_summary });
      } else if (field === 'actions') {
        await onMeetingUpdate({ action_items: editValues.action_items });
      } else if (field === 'outline') {
        await onMeetingUpdate({ meeting_outline: editValues.meeting_outline });
      }
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const generatedTime = meeting.updated_at ? new Date(meeting.updated_at).toLocaleString() : 'Unknown';

  return (
    <section className="results-section">
      <div className="results-header">
        <h2>📋 Meeting Notes Generated</h2>
        <div className="results-meta">
          <span>Generated at {generatedTime}</span>
        </div>
      </div>

      <div className="results-grid-three">
        {/* 1. Executive Summary Card */}
        <div className="result-card">
          <div className="card-header">
            <h3>📝 Executive Summary</h3>
            <button 
              className="btn-edit-small" 
              onClick={() => startEdit('summary')}
              title="Edit Summary"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="editable-field">
            {editingField === 'summary' ? (
              <div className="edit-controls">
                <textarea
                  className="edit-textarea"
                  rows={8}
                  placeholder="Enter comprehensive meeting summary..."
                  value={editValues.executive_summary}
                  onChange={(e) => handleInputChange('executive_summary', e.target.value)}
                />
                <div className="edit-buttons">
                  <button className="btn-save" onClick={() => saveField('summary')}>✓ Save Changes</button>
                  <button className="btn-cancel" onClick={cancelEdit}>✗ Cancel</button>
                </div>
              </div>
            ) : (
              <div className="result-content editable-text" onClick={() => startEdit('summary')}>
                {meeting.executive_summary || 'No summary available'}
              </div>
            )}
          </div>
        </div>

        {/* 2. Action Items Card */}
        <div className="result-card">
          <div className="card-header">
            <h3>✅ Action Items & Commitments</h3>
            <button 
              className="btn-edit-small" 
              onClick={() => startEdit('actions')}
              title="Edit Action Items"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="editable-field">
            {editingField === 'actions' ? (
              <div className="edit-controls">
                <textarea
                  className="edit-textarea"
                  rows={8}
                  placeholder="Enter action items, deadlines, and commitments..."
                  value={editValues.action_items}
                  onChange={(e) => handleInputChange('action_items', e.target.value)}
                />
                <div className="edit-buttons">
                  <button className="btn-save" onClick={() => saveField('actions')}>✓ Save Changes</button>
                  <button className="btn-cancel" onClick={cancelEdit}>✗ Cancel</button>
                </div>
              </div>
            ) : (
              <div className="result-content editable-text" onClick={() => startEdit('actions')}>
                {meeting.action_items || 'No action items identified'}
              </div>
            )}
          </div>
        </div>

        {/* 3. Complete Meeting Outline Card */}
        <div className="result-card">
          <div className="card-header">
            <h3>📊 Complete Meeting Outline</h3>
            <button 
              className="btn-edit-small" 
              onClick={() => startEdit('outline')}
              title="Edit Outline"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="editable-field">
            {editingField === 'outline' ? (
              <div className="edit-controls">
                <textarea
                  className="edit-textarea"
                  rows={8}
                  placeholder="Enter structured meeting outline..."
                  value={editValues.meeting_outline}
                  onChange={(e) => handleInputChange('meeting_outline', e.target.value)}
                />
                <div className="edit-buttons">
                  <button className="btn-save" onClick={() => saveField('outline')}>✓ Save Changes</button>
                  <button className="btn-cancel" onClick={cancelEdit}>✗ Cancel</button>
                </div>
              </div>
            ) : (
              <div className="result-content editable-text" onClick={() => startEdit('outline')}>
                {meeting.meeting_outline || 'No outline available'}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="download-section">
        <h3>💾 Download Meeting Notes</h3>
        <div className="download-buttons">
          <button 
            className="btn btn-primary"
            onClick={() => onDownload('txt')}
          >
            📄 Download as TXT
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => onDownload('json')}
          >
            📊 Download as JSON
          </button>
        </div>
      </div>
    </section>
  );
};