import { useState, useEffect, useCallback } from 'react';
import { Meeting, MeetingUpdate, AudioProcessingResult } from '../types';
import { apiService } from '../services/api';

export const useMeeting = (meetingId: string) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(1);
  const [processMessage, setProcessMessage] = useState('');

  const loadMeeting = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, check if any meetings exist at all
      const allMeetings = await apiService.getMeetings();
      console.log(`🔍 Total meetings in database: ${allMeetings.meetings?.length || 0}`);
      if (allMeetings.meetings?.length > 0) {
        console.log(`🔍 Available meeting IDs:`, allMeetings.meetings.map(m => m.id));
      }
      
      const meetingData = await apiService.getMeeting(meetingId);
      setMeeting(meetingData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meeting';
      setError(errorMessage);
      console.error(`❌ Failed to load meeting ID: ${meetingId}`, err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const updateMeeting = useCallback(async (data: MeetingUpdate) => {
    if (!meeting) return;

    try {
      await apiService.updateMeeting(meetingId, data);
      // Update local state
      setMeeting({ ...meeting, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
    }
  }, [meetingId, meeting]);

  const processAudio = useCallback(async (file: File) => {
    let timeouts: number[] = [];
    
    try {
      setProcessing(true);
      setProcessStep(1);
      setProcessMessage('Uploading file...');

      // Set up progress steps with proper cleanup
      const progressSteps = [
        { step: 2, delay: 1000, message: 'Converting audio...' },
        { step: 3, delay: 3000, message: 'Transcribing speech...' },
        { step: 4, delay: 8000, message: 'Analyzing content...' },
        { step: 5, delay: 12000, message: 'Generating notes...' },
      ];

      // Schedule progress updates
      progressSteps.forEach(({ step, delay, message }) => {
        const timeout = setTimeout(() => {
          setProcessStep(step);
          setProcessMessage(message);
        }, delay);
        timeouts.push(timeout);
      });

      // Process the audio
      const result = await apiService.processAudio(meetingId, file);
      
      // Clear any remaining timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      
      // Final step
      setProcessStep(5);
      setProcessMessage('Complete!');

      // Small delay to show completion before updating
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update meeting status and reload
      await updateMeeting({ status: 'completed' });
      await loadMeeting();

      return result;
    } catch (err) {
      // Clear timeouts on error
      timeouts.forEach(timeout => clearTimeout(timeout));
      setError(err instanceof Error ? err.message : 'Processing failed');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [meetingId, updateMeeting, loadMeeting]);

  const downloadNotes = useCallback(async (format: 'txt' | 'json' = 'txt') => {
    try {
      const blob = await apiService.downloadMeetingNotes(meetingId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting?.title?.replace(/[^a-z0-9]/gi, '_') || 'meeting'}_notes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }, [meetingId, meeting?.title]);

  useEffect(() => {
    if (meetingId) {
      loadMeeting();
    }
  }, [meetingId, loadMeeting]);

  return {
    meeting,
    loading,
    error,
    processing,
    processStep,
    processMessage,
    loadMeeting,
    updateMeeting,
    processAudio,
    downloadNotes,
  };
};