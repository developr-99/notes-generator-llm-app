import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeeting } from '../hooks/useMeeting';
import { MeetingHeader } from './MeetingHeader';
import { MeetingInfo } from './MeetingInfo';
import { AudioRecording } from './AudioRecording';
import { ProcessingSection } from './ProcessingSection';
import { MeetingResults } from './MeetingResults';
import { ErrorSection } from './ErrorSection';

export const MeetingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meetingId = id!;
  
  const {
    meeting,
    loading,
    error,
    processing,
    processStep,
    processMessage,
    loadMeeting,
    updateMeeting,
    processAudio,
    downloadNotes
  } = useMeeting(meetingId);

  const [showResults, setShowResults] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleAudioProcessing = async (file: File) => {
    try {
      setShowError(false);
      const result = await processAudio(file);
      setShowResults(true);
      return result;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Processing failed');
      setShowError(true);
      throw err;
    }
  };

  const handleRetry = () => {
    setShowResults(false);
    setShowError(false);
    setErrorMessage('');
  };

  const handleDownload = (format: 'txt' | 'json') => {
    downloadNotes(format);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading meeting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Meeting not found</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={handleBackToHome}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const hasExistingNotes = meeting.transcript && meeting.transcript.trim().length > 0;

  return (
    <div className="container">
      <MeetingHeader 
        meeting={meeting}
        onBackToHome={handleBackToHome}
        onMeetingUpdate={updateMeeting}
      />

      <main className="main-content">
        <MeetingInfo 
          meeting={meeting}
          onMeetingUpdate={updateMeeting}
        />

        {/* Show results if meeting has existing notes or if processing completed */}
        {(hasExistingNotes || showResults) && (
          <MeetingResults
            meeting={meeting}
            onDownload={handleDownload}
            onMeetingUpdate={updateMeeting}
          />
        )}

        {/* Show recording section if no notes and not processing */}
        {!hasExistingNotes && !processing && !showResults && !showError && (
          <AudioRecording onAudioProcess={handleAudioProcessing} />
        )}

        {/* Show processing section */}
        {processing && (
          <ProcessingSection
            step={processStep}
            message={processMessage}
          />
        )}

        {/* Show error section */}
        {showError && (
          <ErrorSection
            message={errorMessage}
            onRetry={handleRetry}
          />
        )}
      </main>
    </div>
  );
};