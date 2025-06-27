import { useState, useEffect, useCallback } from 'react';
import { Meeting, MeetingStats } from '../types';
import { apiService } from '../services/api';

export const useMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MeetingStats>({
    totalMeetings: 0,
    plannedMeetings: 0,
    completedMeetings: 0,
    totalHours: 0,
  });

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getMeetings();
      setMeetings(result.meetings);
      setFilteredMeetings(result.meetings);
      updateStats(result.meetings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStats = (meetingsList: Meeting[]) => {
    const totalMeetings = meetingsList.length;
    const plannedMeetings = meetingsList.filter(m => m.status === 'planned').length;
    const completedMeetings = meetingsList.filter(m => m.status === 'completed').length;
    const totalHours = completedMeetings; // Rough estimate

    setStats({
      totalMeetings,
      plannedMeetings,
      completedMeetings,
      totalHours,
    });
  };

  const searchMeetings = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredMeetings(meetings);
      return;
    }

    try {
      const result = await apiService.searchMeetings(query);
      setFilteredMeetings(result.meetings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  }, [meetings]);

  const filterMeetings = useCallback((status?: string) => {
    if (!status) {
      setFilteredMeetings(meetings);
    } else {
      setFilteredMeetings(meetings.filter(meeting => meeting.status === status));
    }
  }, [meetings]);

  const sortMeetings = useCallback((sortBy: string) => {
    const sorted = [...filteredMeetings].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(`${b.scheduled_date} ${b.scheduled_time}`).getTime() - 
                 new Date(`${a.scheduled_date} ${a.scheduled_time}`).getTime();
        case 'date_asc':
          return new Date(`${a.scheduled_date} ${a.scheduled_time}`).getTime() - 
                 new Date(`${b.scheduled_date} ${b.scheduled_time}`).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    setFilteredMeetings(sorted);
  }, [filteredMeetings]);

  const deleteMeeting = useCallback(async (id: string) => {
    try {
      await apiService.deleteMeeting(id);
      await loadMeetings(); // Reload after deletion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meeting');
    }
  }, [loadMeetings]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  return {
    meetings: filteredMeetings,
    loading,
    error,
    stats,
    loadMeetings,
    searchMeetings,
    filterMeetings,
    sortMeetings,
    deleteMeeting,
  };
};