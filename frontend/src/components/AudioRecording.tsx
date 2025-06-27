import React, { useState, useRef, useEffect } from 'react';

interface AudioRecordingProps {
  onAudioProcess: (file: File) => Promise<any>;
}

export const AudioRecording: React.FC<AudioRecordingProps> = ({ onAudioProcess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to record');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkMicrophoneAvailability();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkMicrophoneAvailability = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusMessage('❌ Microphone not supported in this browser');
      return;
    }

    const isSecureContext = window.isSecureContext || 
      location.hostname === 'localhost' || 
      location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      setStatusMessage('⚠️ HTTPS required for microphone access');
      return;
    }

    setStatusMessage('🎙️ Ready to record');
    setMicrophoneAvailable(true);
  };

  const startRecording = async () => {
    if (!microphoneAvailable) {
      alert('Microphone not available');
      return;
    }

    setStatusMessage('🔄 Requesting microphone permission...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          throw new Error('No supported audio format found');
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', () => {
        processRecording();
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setStatusMessage('🔴 Recording... Speak clearly');
      startTimer();

    } catch (error: any) {
      console.error('Microphone permission error:', error);
      handleMicrophoneError(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        stopTimer();
        setStatusMessage('📝 Processing your recording...');
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setStatusMessage('❌ No audio data recorded. Please try recording again.');
      return;
    }

    try {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const audioFile = new File([audioBlob], `recording_${Date.now()}.${extension}`, {
        type: mimeType
      });

      console.log(`Created audio file: ${audioFile.name}, size: ${audioFile.size} bytes`);
      await onAudioProcess(audioFile);

    } catch (error) {
      console.error('Error processing recording:', error);
      setStatusMessage(`❌ Failed to process recording: ${error}`);
    }
  };

  const handleMicrophoneError = (error: any) => {
    let errorMessage = '';
    let helpText = '';

    switch (error.name) {
      case 'NotAllowedError':
        errorMessage = '❌ Microphone permission denied';
        helpText = 'Please allow microphone access and try again.';
        break;
      case 'NotFoundError':
        errorMessage = '❌ No microphone found';
        helpText = 'Please connect a microphone and refresh the page.';
        break;
      default:
        errorMessage = '❌ Could not access microphone';
        helpText = 'Please check your microphone settings and try again.';
    }

    setStatusMessage(errorMessage);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/webm'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4', '.webm'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Please select a valid audio file (MP3, WAV, M4A, FLAC, OGG, MP4, WebM)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB');
      return;
    }

    if (file.size < 1000) {
      alert('Audio file is too small. Please record for at least a few seconds.');
      return;
    }

    try {
      await onAudioProcess(file);
    } catch (error) {
      console.error('File processing error:', error);
    }

    // Reset file input
    event.target.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="recording-section">
      <div className="recording-cards-container">
        {/* Record Meeting Card */}
        <div className="recording-card">
          <h3>🎙️ Record Meeting</h3>
          <p>Start recording to generate AI-powered meeting notes</p>

          {/* Recording Controls */}
          <div className="recording-controls">
            <div className="recording-area">
              <div className="recording-icon">🎙️</div>
              <div className="recording-status">{statusMessage}</div>
              {isRecording && (
                <div className="recording-timer">
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            <div className="control-buttons">
              {!isRecording ? (
                <button 
                  className="btn btn-danger btn-large"
                  onClick={startRecording}
                  disabled={!microphoneAvailable}
                >
                  🔴 Start Recording
                </button>
              ) : (
                <button 
                  className="btn btn-secondary btn-large"
                  onClick={stopRecording}
                >
                  ⏹️ Stop Recording
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upload Audio File Card */}
        <div className="upload-card">
          <h3>📁 Choose Audio File</h3>
          <p>Upload an existing audio file for analysis</p>

          <div className="upload-area">
            <div className="upload-icon">📁</div>
            <p>Select your audio file</p>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Audio File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <div className="supported-formats">
              Supports: MP3, WAV, M4A, FLAC, OGG, MP4, WebM
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};