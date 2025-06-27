import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../hooks/useMeetings';
import { MeetingCard } from './MeetingCard';
import { NewMeetingModal } from './NewMeetingModal';
import { EditMeetingModal } from './EditMeetingModal';
import { StatsSection } from './StatsSection';
import { Meeting } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { meetings, loading, error, stats, loadMeetings, searchMeetings, filterMeetings, sortMeetings, deleteMeeting } = useMeetings();
  
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const handleSearch = () => {
    searchMeetings(searchQuery);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    filterMeetings(status || undefined);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    sortMeetings(sort);
  };

  const handleMeetingCreated = (meetingId: string) => {
    setShowNewMeetingModal(false);
    loadMeetings();
    navigate(`/meeting/${meetingId}`);
  };

  const handleMeetingUpdated = () => {
    setEditingMeeting(null);
    loadMeetings();
  };

  const handleMeetingClick = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      await deleteMeeting(meetingId);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading meetings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="header-title">
              <span className="header-icon">🎙️</span>
              <h1>Meeting Management System</h1>
            </div>
            <p className="header-subtitle">Organize, record, and analyze your meetings with AI-powered insights</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setShowNewMeetingModal(true)}
            >
              <span className="btn-icon">➕</span>
              New Meeting
            </button>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search meetings..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="search-btn" onClick={handleSearch}>
                🔍
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Quick Stats */}
        <StatsSection stats={stats} />

        {/* Filters */}
        <section className="filters-section">
          <div className="filter-group">
            <label htmlFor="statusFilter">Status:</label>
            <select
              id="statusFilter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <option value="">All</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="sortBy">Sort by:</label>
            <select
              id="sortBy"
              className="filter-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
            </select>
          </div>
        </section>

        {/* Meetings List */}
        <section className="meetings-section">
          <div className="section-header">
            <h2>Recent Meetings</h2>
            <span className="meeting-count">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </span>
          </div>

          {meetings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No meetings yet</h3>
              <p>Create your first meeting to get started with AI-powered meeting notes</p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowNewMeetingModal(true)}
              >
                Create First Meeting
              </button>
            </div>
          ) : (
            <div className="meetings-grid">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => handleMeetingClick(meeting.id)}
                  onEdit={() => handleEditMeeting(meeting)}
                  onDelete={() => handleDeleteMeeting(meeting.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {showNewMeetingModal && (
        <NewMeetingModal
          onClose={() => setShowNewMeetingModal(false)}
          onMeetingCreated={handleMeetingCreated}
        />
      )}

      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onMeetingUpdated={handleMeetingUpdated}
        />
      )}
    </div>
  );
};