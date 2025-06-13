class MeetingNotesApp {
    constructor() {
        this.currentSessionId = null;
        this.processingInterval = null;
        this.currentStep = 1;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.microphoneAvailable = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkSystemStatus();
        this.checkMicrophoneAvailability();
    }

    async checkMicrophoneAvailability() {
        // Don't request permission immediately, just check if microphone API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            document.getElementById('recordingStatus').innerHTML = 
                '<span style="color: #dc3545;">❌ Microphone not supported in this browser</span>';
            document.getElementById('recordButton').disabled = true;
            return;
        }

        // Check if we're on HTTPS or localhost
        const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
            document.getElementById('recordingStatus').innerHTML = 
                '<span style="color: #d97706;">⚠️ HTTPS required for microphone access. Recording disabled.</span>';
            document.getElementById('recordButton').disabled = true;
            return;
        }

        // Show that microphone is available but permission needed
        document.getElementById('recordingStatus').innerHTML = 
            '<span style="color: #6c757d;">🎙️ Click "Start Recording" to enable microphone</span>';
        this.microphoneAvailable = true;
    }

    setupEventListeners() {
        // Recording elements
        const recordButton = document.getElementById('recordButton');
        const stopButton = document.getElementById('stopButton');
        
        // File upload elements
        const uploadArea = document.getElementById('uploadArea');
        const uploadButton = document.getElementById('uploadButton');
        const fileInput = document.getElementById('fileInput');
        const retryButton = document.getElementById('retryButton');

        // Recording event listeners
        recordButton.addEventListener('click', () => this.requestMicrophoneAndStart());
        stopButton.addEventListener('click', () => this.stopRecording());

        // Upload button click - FIXED to prevent double-trigger
        uploadButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // File input change - FIXED with proper event handling
        fileInput.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target.files && e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
                // Clear the input to allow same file to be selected again
                e.target.value = '';
            }
        });

        // Drag and drop - FIXED to prevent conflicts
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Retry button
        retryButton.addEventListener('click', () => {
            this.showSection('inputSection');
        });

        // Download buttons
        document.getElementById('downloadTxt')?.addEventListener('click', () => {
            this.downloadFile('txt');
        });

        document.getElementById('downloadJson')?.addEventListener('click', () => {
            this.downloadFile('json');
        });

        document.getElementById('processNewFile')?.addEventListener('click', () => {
            this.resetApp();
        });
    }

    async requestMicrophoneAndStart() {
        if (!this.microphoneAvailable) {
            this.showMicrophoneError('Microphone not available');
            return;
        }

        // Update UI to show we're requesting permission
        document.getElementById('recordingStatus').innerHTML = 
            '<span style="color: #007bff;">🔄 Requesting microphone permission...</span>';
        
        document.getElementById('recordButton').disabled = true;

        try {
            // Request microphone permission with detailed constraints
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1
                } 
            });

            // Permission granted, start recording
            this.startRecordingWithStream(stream);

        } catch (error) {
            console.error('Microphone permission error:', error);
            this.handleMicrophoneError(error);
        }
    }

    handleMicrophoneError(error) {
        document.getElementById('recordButton').disabled = false;
        
        let errorMessage = '';
        let helpText = '';

        switch (error.name) {
            case 'NotAllowedError':
                errorMessage = '❌ Microphone permission denied';
                helpText = 'Please click the microphone icon in your browser\'s address bar and allow access, then try again.';
                break;
            case 'NotFoundError':
                errorMessage = '❌ No microphone found';
                helpText = 'Please connect a microphone and refresh the page.';
                break;
            case 'NotSupportedError':
                errorMessage = '❌ Microphone not supported';
                helpText = 'Your browser or device doesn\'t support microphone recording.';
                break;
            case 'AbortError':
                errorMessage = '❌ Microphone access aborted';
                helpText = 'Please try again.';
                break;
            default:
                errorMessage = '❌ Could not access microphone';
                helpText = 'Please check your microphone settings and try again.';
        }

        document.getElementById('recordingStatus').innerHTML = 
            `<div style="color: #dc3545; text-align: center;">
                <div style="font-weight: 600; margin-bottom: 8px;">${errorMessage}</div>
                <div style="font-size: 0.85rem; color: #6c757d;">${helpText}</div>
                <div style="margin-top: 12px;">
                    <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        🔄 Refresh Page
                    </button>
                </div>
            </div>`;
    }

    startRecordingWithStream(stream) {
        try {
            // Check if MediaRecorder is supported
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (!MediaRecorder.isTypeSupported('audio/mp4')) {
                    throw new Error('No supported audio format found');
                }
                this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
            } else {
                this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            }

            this.audioChunks = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now();

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });

            this.mediaRecorder.addEventListener('stop', () => {
                this.processRecording();
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            });

            this.mediaRecorder.addEventListener('error', (event) => {
                console.error('MediaRecorder error:', event.error);
                this.handleRecordingError(event.error);
            });

            // Start recording with data chunks every second
            this.mediaRecorder.start(1000);
            this.updateRecordingUI(true);
            this.startTimer();

            document.getElementById('recordButton').disabled = false;

        } catch (error) {
            console.error('Error starting MediaRecorder:', error);
            this.handleRecordingError(error);
            // Stop stream if recording failed
            stream.getTracks().forEach(track => track.stop());
        }
    }

    handleRecordingError(error) {
        this.isRecording = false;
        this.updateRecordingUI(false);
        this.stopTimer();
        
        document.getElementById('recordingStatus').innerHTML = 
            `<span style="color: #dc3545;">❌ Recording error: ${error.message}</span>`;
        document.getElementById('recordButton').disabled = false;
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            try {
                this.mediaRecorder.stop();
                this.isRecording = false;
                this.updateRecordingUI(false);
                this.stopTimer();
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.handleRecordingError(error);
            }
        }
    }

    updateRecordingUI(recording) {
        const recordButton = document.getElementById('recordButton');
        const stopButton = document.getElementById('stopButton');
        const recordingIcon = document.getElementById('recordingIcon');
        const recordingTitle = document.getElementById('recordingTitle');
        const recordingText = document.getElementById('recordingText');
        const timer = document.getElementById('recordingTimer');
        const recordingArea = document.getElementById('recordingArea');

        if (recording) {
            recordButton.style.display = 'none';
            stopButton.style.display = 'inline-flex';
            recordingIcon.textContent = '🔴';
            recordingTitle.textContent = 'Recording in Progress...';
            recordingText.textContent = 'Speak clearly into your microphone. Click stop when finished.';
            timer.style.display = 'block';
            recordingArea.classList.add('recording');
            document.getElementById('recordingStatus').innerHTML = 
                '<span style="color: #28a745; font-weight: 600;">🎙️ Recording... Speak clearly</span>';
        } else {
            recordButton.style.display = 'inline-flex';
            stopButton.style.display = 'none';
            recordingIcon.textContent = '🎙️';
            recordingTitle.textContent = 'Record Your Meeting';
            recordingText.textContent = 'Click the button below to start recording your meeting or conversation';
            timer.style.display = 'none';
            recordingArea.classList.remove('recording');
            
            if (this.audioChunks.length > 0) {
                document.getElementById('recordingStatus').innerHTML = 
                    '<span style="color: #007bff;">📝 Processing your recording...</span>';
            }
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timerValue').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async processRecording() {
        if (this.audioChunks.length === 0) {
            this.showError('No audio data recorded. Please try recording again.');
            return;
        }

        try {
            // Determine the correct MIME type based on what was recorded
            const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            
            // Create appropriate file extension
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const audioFile = new File([audioBlob], `recording_${Date.now()}.${extension}`, {
                type: mimeType
            });

            console.log(`Created audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

            // Process the recorded audio
            await this.handleFileUpload(audioFile);

        } catch (error) {
            console.error('Error processing recording:', error);
            this.showError(`Failed to process recording: ${error.message}`);
        }
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/health');
            const status = await response.json();
            
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            
            if (status.whisper_loaded && status.ollama_connected) {
                statusIndicator.className = 'status-indicator healthy';
                statusText.textContent = '✅ System Ready';
            } else {
                statusIndicator.className = 'status-indicator error';
                let issues = [];
                if (!status.whisper_loaded) issues.push('Whisper not loaded');
                if (!status.ollama_connected) issues.push('Ollama not connected');
                statusText.textContent = `⚠️ Issues: ${issues.join(', ')}`;
            }
        } catch (error) {
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            statusIndicator.className = 'status-indicator error';
            statusText.textContent = '❌ Backend not available';
        }
    }

    async handleFileUpload(file) {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Validate file
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/webm'];
        const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4', '.webm'];
        
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            this.showError('Please select a valid audio file (MP3, WAV, M4A, FLAC, OGG, MP4, WebM)');
            return;
        }

        // Check file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
            this.showError('File size must be less than 100MB');
            return;
        }

        // Check minimum file size (1KB)
        if (file.size < 1000) {
            this.showError('Audio file is too small. Please record for at least a few seconds.');
            return;
        }

        // Start processing
        this.showProcessing();
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            console.log('Uploading file to server...');

            // Start realistic progress simulation
            this.startRealisticProgress();

            // Upload and process
            const response = await fetch('/process-audio', {
                method: 'POST',
                body: formData
            });

            // Stop progress simulation
            this.stopProgressSimulation();

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Processing failed';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Show completion
            this.updateProgress(5, 'Complete!');
            
            const result = await response.json();
            this.currentSessionId = result.session_id;
            
            console.log('Processing completed successfully');

            // Small delay to show completion state
            setTimeout(() => {
                this.displayResults(result);
            }, 1500);

        } catch (error) {
            console.error('Processing error:', error);
            this.stopProgressSimulation();
            this.showError(`Processing failed: ${error.message}`);
        }
    }

    startRealisticProgress() {
        this.currentStep = 1;
        this.updateProgress(1, 'Uploading file...');
        
        // Simulate realistic timing based on actual processing
        const progressSteps = [
            { step: 2, delay: 2000, message: 'Converting audio...' },
            { step: 3, delay: 5000, message: 'Transcribing speech...' },
            { step: 4, delay: 15000, message: 'Analyzing content...' },
        ];

        progressSteps.forEach(({ step, delay, message }) => {
            setTimeout(() => {
                if (this.processingInterval !== null) { // Only update if still processing
                    this.currentStep = step;
                    this.updateProgress(step, message);
                }
            }, delay);
        });
    }

    stopProgressSimulation() {
        this.processingInterval = null; // Mark as stopped
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['inputSection', 'processingSection', 'errorSection', 'resultsSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }

    showProcessing() {
        this.showSection('processingSection');
        this.processingInterval = true; // Mark as processing
        this.updateProgress(1, 'Starting...');
    }

    updateProgress(step, message) {
        console.log(`Progress Update: Step ${step} - ${message}`); // Debug log
        
        // Update step indicators
        for (let i = 1; i <= 5; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                if (i < step) {
                    stepElement.classList.add('completed');
                } else if (i === step) {
                    stepElement.classList.add('active');
                }
            }
        }

        // Update message
        const processingTitle = document.getElementById('processingTitle');
        const processingMessage = document.getElementById('processingMessage');
        
        if (processingTitle && processingMessage) {
            switch(step) {
                case 1:
                    processingTitle.textContent = 'Uploading file...';
                    processingMessage.textContent = 'Preparing your audio file for processing';
                    break;
                case 2:
                    processingTitle.textContent = 'Converting audio...';
                    processingMessage.textContent = 'Optimizing audio format for transcription';
                    break;
                case 3:
                    processingTitle.textContent = 'Transcribing speech...';
                    processingMessage.textContent = 'Converting speech to text using AI';
                    break;
                case 4:
                    processingTitle.textContent = 'Analyzing content...';
                    processingMessage.textContent = 'Understanding context and extracting insights';
                    break;
                case 5:
                    processingTitle.textContent = 'Generating notes...';
                    processingMessage.textContent = 'Creating structured meeting documentation';
                    break;
                default:
                    processingTitle.textContent = 'Processing...';
                    processingMessage.textContent = message || 'Working on your request';
            }
        }
    }

    showError(message) {
        this.stopProgressSimulation();
        this.stopTimer();
        this.showSection('errorSection');
        document.getElementById('errorMessage').textContent = message;
    }

    displayResults(data) {
        this.showSection('resultsSection');

        // Update stats
        document.getElementById('wordCount').textContent = `${data.word_count} words`;
        document.getElementById('generatedTime').textContent = 
            `Generated at ${new Date(data.generated_at).toLocaleString()}`;

        // Update content with proper field names and fallbacks
        document.getElementById('summaryContent').textContent = 
            data.executive_summary || data.summary || 'No summary available';
        document.getElementById('notesContent').textContent = 
            data.discussion_notes || data.notes || 'No notes available';
        document.getElementById('actionItemsContent').textContent = 
            data.action_items || 'No action items identified';
        document.getElementById('outlineContent').textContent = 
            data.meeting_outline || data.outline || 'No outline available';
        document.getElementById('transcriptContent').textContent = 
            data.transcript || 'No transcript available';

        // Store data for downloads
        this.currentData = data;
    }

    async downloadFile(format) {
        if (!this.currentSessionId) {
            alert('No session data available for download');
            return;
        }

        try {
            const response = await fetch(`/download/${this.currentSessionId}?format=${format}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }

            // Create download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting_notes_${this.currentSessionId}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            alert(`Download failed: ${error.message}`);
        }
    }

    resetApp() {
        this.stopProgressSimulation();
        this.stopTimer();
        if (this.isRecording) {
            this.stopRecording();
        }
        this.showSection('inputSection');
        this.currentSessionId = null;
        this.currentData = null;
        this.currentStep = 1;
        document.getElementById('fileInput').value = '';
        
        // Reset recording UI
        this.updateRecordingUI(false);
        document.getElementById('recordingStatus').innerHTML = 
            '<span style="color: #6c757d;">🎙️ Click "Start Recording" to enable microphone</span>';
        document.getElementById('timerValue').textContent = '00:00';
        document.getElementById('recordButton').disabled = false;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MeetingNotesApp();
});