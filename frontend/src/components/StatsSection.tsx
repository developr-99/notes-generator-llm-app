import React from 'react';
import { MeetingStats } from '../types';

interface StatsSectionProps {
  stats: MeetingStats;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <section className="stats-section">
      <div className="stat-card-combined">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{stats.totalMeetings}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.plannedMeetings}</div>
            <div className="stat-label">Planned</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.completedMeetings}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>
    </section>
  );
};