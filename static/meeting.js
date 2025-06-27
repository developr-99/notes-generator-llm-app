console.log('🚀 MEETING.JS FILE LOADED');
console.log('🚀 Location:', window.location.href);

class MeetingPage {
    constructor() {
        console.log('🏗️ MeetingPage constructor called');
        console.log('🏗️ Current URL:', window.location.href);
        console.log('🏗️ Pathname:', window.location.pathname);
        
        this.meetingId = this.getMeetingIdFromUrl();
        console.log('🏗️ Extracted meeting ID:', this.meetingId);
        
        this.meeting = null;
        this.currentSessionId = null;
        this.processingInterval = null;
        this.currentStep = 1;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.microphoneAvailable = false;
        this.editMode = false;
        this.originalValues = {}; // Store original values for cancel functionality
        this.init();
    }

    getMeetingIdFromUrl() {
        const path = window.location.pathname;
        return path.split('/').pop();
    }

    async init() {
        await this.loadMeeting();
        this.setupEventListeners();
        this.checkMicrophoneAvailability();
        await this.checkSystemStatus();
    }

    async loadMeeting() {
        try {
            console.log(`🔍 Loading meeting with ID: ${this.meetingId}`);
            console.log(`🔍 Full URL: ${window.location.origin}/api/meetings/${this.meetingId}`);
            
            // First, let's check if any meetings exist at all
            const allMeetingsResponse = await fetch('/api/meetings');
            console.log(`🔍 All meetings API status: ${allMeetingsResponse.status}`);
            if (allMeetingsResponse.ok) {
                const allMeetings = await allMeetingsResponse.json();
                console.log(`🔍 Total meetings in database: ${allMeetings.meetings?.length || 0}`);
                if (allMeetings.meetings?.length > 0) {
                    console.log(`🔍 Available meeting IDs:`, allMeetings.meetings.map(m => m.id));
                }
            }
            
            const response = await fetch(`/api/meetings/${this.meetingId}`);
            console.log(`🔍 Specific meeting API Response status: ${response.status}`);
            
            if (response.ok) {
                // SUCCESS: Parse the meeting data
                this.meeting = await response.json();
                console.log('✅ Meeting loaded successfully:', this.meeting.title);
                
                // Render the meeting information on the page
                this.renderMeetingInfo();
                
                // Check if meeting has existing notes/transcript
                this.checkExistingNotes();
                
                // Show audio file info if available
                this.showAudioInfo();
                
            } else {
                // ERROR: Meeting not found or other API error
                const errorText = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorText);
                console.error(`❌ Failed to load meeting ID: ${this.meetingId}`);
                console.error(`❌ Request URL: /api/meetings/${this.meetingId}`);
                
                // Don't automatically redirect - let user decide
                const userChoice = confirm(`Meeting not found (${response.status}). Would you like to go back to the home page?`);
                if (userChoice) {
                    window.location.href = '/';
                } else {
                    // Show error on page instead of redirecting
                    this.showError(`Meeting not found. Please check the meeting ID: ${this.meetingId}`);
                }
            }
        } catch (error) {
            // NETWORK/JAVASCRIPT ERROR
            console.error('❌ Error loading meeting:', error);
            console.error('Error details:', error.stack);
            console.error(`❌ Meeting ID: ${this.meetingId}`);
            
            // Don't automatically redirect for network errors either
            const userChoice = confirm(`Error loading meeting: ${error.message}. Would you like to go back to the home page?`);
            if (userChoice) {
                window.location.href = '/';
            } else {
                // Show error on page instead of redirecting
                this.showError(`Network error loading meeting. Please check your connection and try again.`);
            }
        }
    }

    renderMeetingInfo() {
        // Update meeting header
        document.getElementById('meetingTitle').textContent = this.meeting.title;

        const date = new Date(`${this.meeting.scheduled_date} ${this.meeting.scheduled_time}`);
        document.getElementById('meetingDateTime').textContent =
            `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Update status badge
        const statusBadge = document.getElementById('meetingStatus');
        statusBadge.textContent = this.meeting.status.charAt(0).toUpperCase() +
            this.meeting.status.slice(1).replace('-', ' ');
        statusBadge.className = `status-badge status-${this.meeting.status}`;

        // Update agenda
        document.getElementById('meetingAgenda').textContent =
            this.meeting.agenda || 'No agenda specified';

        // Update participants
        this.renderParticipants();
    }

    renderParticipants() {
        const participantsList = document.getElementById('meetingParticipants');
        if (this.meeting.participants && this.meeting.participants.length > 0) {
            participantsList.innerHTML = this.meeting.participants
                .map(p => `<div class="participant">${p.name}${p.role ? ` (${p.role})` : ''}</div>`)
                .join('');
        } else {
            participantsList.textContent = 'No participants added';
        }
    }

    showAudioInfo() {
        if (this.meeting.audio_file_path) {
            const audioSection = document.getElementById('audioInfoSection');
            const fileName = this.meeting.audio_file_path.split('/').pop();

            document.getElementById('audioFileName').textContent = fileName;
            document.getElementById('audioFilePath').textContent = this.meeting.audio_file_path;

            audioSection.style.display = 'block';
        }
    }

    checkExistingNotes() {
        console.log('🔍 Checking for existing notes...');
        console.log('🔍 Meeting transcript exists:', !!this.meeting.transcript);
        console.log('🔍 Transcript length:', this.meeting.transcript ? this.meeting.transcript.length : 0);
        
        if (this.meeting.transcript && this.meeting.transcript.trim()) {
            console.log('✅ Found existing notes, displaying them');
            this.displayExistingNotes();
        } else {
            console.log('❌ No existing notes found');
            console.log('📝 Meeting data:', {
                hasTranscript: !!this.meeting.transcript,
                hasSummary: !!this.meeting.executive_summary,
                hasActions: !!this.meeting.action_items,
                hasOutline: !!this.meeting.meeting_outline,
                status: this.meeting.status
            });
        }
    }

    // 1. UPDATED: Display existing notes with 3 sections
displayExistingNotes() {
    console.log('📋 DISPLAY EXISTING NOTES CALLED');
    console.log('📋 Meeting data:', this.meeting);
    
    try {
        // Hide recording section and show results
        console.log('🔄 Hiding other sections and showing results...');
        document.getElementById('recordingSection').style.display = 'none';
        document.getElementById('processingSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        console.log('✅ Sections updated');

        // Update results with existing data
        const wordCountEl = document.getElementById('wordCount');
        const generatedTimeEl = document.getElementById('generatedTime');
        
        if (wordCountEl && generatedTimeEl) {
            wordCountEl.textContent = `${this.meeting.word_count || 0} words`;
            generatedTimeEl.textContent = `Generated at ${new Date(this.meeting.updated_at).toLocaleString()}`;
            console.log('✅ Stats updated for existing notes');
        } else {
            console.error('❌ Could not find wordCount or generatedTime elements in existing notes');
        }

        // UPDATED: Only 3 sections + transcript
        const summaryEl = document.getElementById('summaryContent');
        const actionsEl = document.getElementById('actionItemsContent');
        const outlineEl = document.getElementById('outlineContent');
        const transcriptEl = document.getElementById('transcriptContent');
        
        if (summaryEl && actionsEl && outlineEl && transcriptEl) {
            summaryEl.textContent = this.meeting.executive_summary || 'No summary available';
            actionsEl.textContent = this.meeting.action_items || 'No action items identified';
            outlineEl.textContent = this.meeting.meeting_outline || 'No outline available';
            transcriptEl.textContent = this.meeting.transcript || 'No transcript available';
            console.log('✅ Content sections updated for existing notes');
        } else {
            console.error('❌ Could not find one or more content elements in existing notes:', {
                summaryEl: !!summaryEl,
                actionsEl: !!actionsEl,
                outlineEl: !!outlineEl,
                transcriptEl: !!transcriptEl
            });
        }

        this.currentSessionId = this.meetingId; // Use meeting ID for downloads
        console.log('✅ Display existing notes completed successfully');
        
    } catch (error) {
        console.error('❌ Error in displayExistingNotes:', error);
    }
}

    // ===========================================
    // INLINE EDITING FUNCTIONALITY
    // ===========================================



    // 3. UPDATED: Get current field value for 3 sections
getCurrentFieldValue(fieldName) {
    switch (fieldName) {
        case 'title':
            return this.meeting.title;
        case 'agenda':
            return this.meeting.agenda || '';
        case 'datetime':
            return {
                date: this.meeting.scheduled_date,
                time: this.meeting.scheduled_time
            };
        case 'status':
            return this.meeting.status;
        case 'participants':
            return this.meeting.participants || [];
        case 'summary':
            return this.meeting.executive_summary || '';
        case 'actions':
            return this.meeting.action_items || '';
        case 'outline':
            return this.meeting.meeting_outline || '';
        // REMOVED: notes, decisions sections
        // transcript is read-only, not editable
        default:
            return '';
    }
}

    // 4. UPDATED: Set input values for 3 sections
setInputValues(fieldName) {
    switch (fieldName) {
        case 'title':
            document.getElementById('titleInput').value = this.meeting.title;
            break;
        case 'agenda':
            document.getElementById('agendaInput').value = this.meeting.agenda || '';
            break;
        case 'datetime':
            document.getElementById('dateInput').value = this.meeting.scheduled_date;
            document.getElementById('timeInput').value = this.meeting.scheduled_time;
            break;
        case 'status':
            document.getElementById('statusSelect').value = this.meeting.status;
            break;
        case 'participants':
            this.populateParticipantsEditor();
            break;
        case 'summary':
            document.getElementById('summaryInput').value = this.meeting.executive_summary || '';
            break;
        case 'actions':
            document.getElementById('actionsInput').value = this.meeting.action_items || '';
            break;
        case 'outline':
            document.getElementById('outlineInput').value = this.meeting.meeting_outline || '';
            break;
        // REMOVED: notes, decisions sections
    }
}


    populateParticipantsEditor() {
        const container = document.getElementById('participantsEditor');
        container.innerHTML = '';

        if (this.meeting.participants && this.meeting.participants.length > 0) {
            this.meeting.participants.forEach(participant => {
                this.addParticipantField(participant);
            });
        } else {
            this.addParticipantField();
        }
    }

    addParticipant() {
        this.addParticipantField();
    }

    addParticipantField(participant = null) {
        const container = document.getElementById('participantsEditor');
        const group = document.createElement('div');
        group.className = 'participant-input-group';
        group.innerHTML = `
            <input type="text" placeholder="Name" class="participant-name" value="${participant?.name || ''}">
            <input type="email" placeholder="Email" class="participant-email" value="${participant?.email || ''}">
            <input type="text" placeholder="Role" class="participant-role" value="${participant?.role || ''}">
            <button type="button" class="btn-remove-participant" onclick="this.parentElement.remove()">−</button>
        `;
        container.appendChild(group);
    }

    removeParticipant(button) {
        button.parentElement.remove();
    }

    // 5. UPDATED: Focus first input for 3 sections
focusFirstInput(fieldName) {
    const inputs = {
        'title': 'titleInput',
        'agenda': 'agendaInput',
        'datetime': 'dateInput',
        'status': 'statusSelect',
        'participants': null, // Handle separately
        'summary': 'summaryInput',
        'actions': 'actionsInput',
        'outline': 'outlineInput'
        // REMOVED: notes, decisions sections
    };

    if (fieldName === 'participants') {
        const firstInput = document.querySelector('#participantsEditor .participant-name');
        if (firstInput) firstInput.focus();
    } else if (inputs[fieldName]) {
        const input = document.getElementById(inputs[fieldName]);
        if (input) {
            input.focus();
            if (input.tagName === 'TEXTAREA' || input.type === 'text') {
                input.select();
            }
        }
    }
}




   // 6. UPDATED: Get input value for 3 sections
getInputValue(fieldName) {
    switch (fieldName) {
        case 'title':
            return document.getElementById('titleInput').value;
        case 'agenda':
            return document.getElementById('agendaInput').value;
        case 'datetime':
            return {
                date: document.getElementById('dateInput').value,
                time: document.getElementById('timeInput').value
            };
        case 'status':
            return document.getElementById('statusSelect').value;
        case 'participants':
            return this.collectParticipants();
        case 'summary':
            return document.getElementById('summaryInput').value;
        case 'actions':
            return document.getElementById('actionsInput').value;
        case 'outline':
            return document.getElementById('outlineInput').value;
        // REMOVED: notes, decisions sections
        default:
            return '';
    }
}

    collectParticipants() {
        const groups = document.querySelectorAll('#participantsEditor .participant-input-group');
        const participants = [];

        groups.forEach(group => {
            const name = group.querySelector('.participant-name').value.trim();
            const email = group.querySelector('.participant-email').value.trim();
            const role = group.querySelector('.participant-role').value.trim();

            if (name) {
                participants.push({ name, email, role });
            }
        });

        return participants;
    }

   // 7. UPDATED: Update meeting object for 3 sections
updateMeetingObject(fieldName, newValue) {
    switch (fieldName) {
        case 'title':
            this.meeting.title = newValue;
            break;
        case 'agenda':
            this.meeting.agenda = newValue;
            break;
        case 'datetime':
            this.meeting.scheduled_date = newValue.date;
            this.meeting.scheduled_time = newValue.time;
            break;
        case 'status':
            this.meeting.status = newValue;
            break;
        case 'participants':
            this.meeting.participants = newValue;
            break;
        case 'summary':
            this.meeting.executive_summary = newValue;
            break;
        case 'actions':
            this.meeting.action_items = newValue;
            break;
        case 'outline':
            this.meeting.meeting_outline = newValue;
            break;
        // REMOVED: notes, decisions sections
    }
}


   // 8. UPDATED: Update field display for 3 sections
updateFieldDisplay(fieldName, newValue) {
    switch (fieldName) {
        case 'title':
            document.getElementById('meetingTitle').textContent = newValue;
            break;
        case 'agenda':
            document.getElementById('meetingAgenda').textContent = newValue || 'No agenda specified';
            break;
        case 'datetime':
            const date = new Date(`${newValue.date} ${newValue.time}`);
            document.getElementById('meetingDateTime').textContent =
                `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            break;
        case 'status':
            const statusBadge = document.getElementById('meetingStatus');
            statusBadge.textContent = newValue.charAt(0).toUpperCase() + newValue.slice(1).replace('-', ' ');
            statusBadge.className = `status-badge status-${newValue}`;
            break;
        case 'participants':
            this.renderParticipants();
            break;
        case 'summary':
            document.getElementById('summaryContent').textContent = newValue || 'No summary available';
            break;
        case 'actions':
            document.getElementById('actionItemsContent').textContent = newValue || 'No action items identified';
            break;
        case 'outline':
            document.getElementById('outlineContent').textContent = newValue || 'No outline available';
            break;
        // REMOVED: notes, decisions sections
    }
}

    
// 9. UPDATED: Save meeting to database for 3 sections
async saveMeetingToDatabase(fieldName, newValue) {
    console.log(`Saving ${fieldName} with value:`, newValue);

    let updateData = {};
    let endpoint = `/api/meetings/${this.meetingId}`;

    switch (fieldName) {
        case 'title':
            updateData = { title: newValue };
            break;
        case 'agenda':
            updateData = { agenda: newValue };
            break;
        case 'datetime':
            updateData = {
                scheduled_date: newValue.date,
                scheduled_time: newValue.time
            };
            break;
        case 'status':
            updateData = { status: newValue };
            break;
        case 'participants':
            updateData = { participants: newValue };
            break;
        case 'summary':
            updateData = { executive_summary: newValue };
            break;
        case 'actions':
            updateData = { action_items: newValue };
            break;
        case 'outline':
            updateData = { meeting_outline: newValue };
            break;
        // REMOVED: notes, decisions sections
        default:
            throw new Error(`Unknown field: ${fieldName}`);
    }

    console.log(`Sending update to ${endpoint}:`, updateData);

    const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', errorText);

        let errorMessage = 'Failed to save changes';
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Update successful:', result);
    return result;
}

    // FIXED: Edit Mode functionality explanation and implementation
    toggleEditMode() {
        this.editMode = !this.editMode;
        const btn = document.getElementById('editModeBtn');
        const body = document.body;

        if (this.editMode) {
            // ENTERING EDIT MODE
            btn.innerHTML = '👁️ Exit Edit Mode';
            btn.classList.add('btn-edit-active');
            body.classList.add('edit-mode-active');

            // Show all edit buttons
            const editButtons = document.querySelectorAll('.btn-edit-small');
            editButtons.forEach(button => {
                button.style.opacity = '1';
                button.style.transform = 'scale(1)';
            });

            // Add visual indicators
            const editableTexts = document.querySelectorAll('.editable-text');
            editableTexts.forEach(text => {
                text.style.border = '1px dashed #6c7b7f';
                text.style.borderRadius = '4px';
                text.title = 'Click to edit';
            });

            // Show edit mode notification
            this.showEditModeNotification();

        } else {
            // EXITING EDIT MODE
            btn.innerHTML = '✏️ Edit Mode';
            btn.classList.remove('btn-edit-active');
            body.classList.remove('edit-mode-active');

            // Hide all edit buttons
            const editButtons = document.querySelectorAll('.btn-edit-small');
            editButtons.forEach(button => {
                button.style.opacity = '';
                button.style.transform = '';
            });

            // Remove visual indicators
            const editableTexts = document.querySelectorAll('.editable-text');
            editableTexts.forEach(text => {
                text.style.border = '';
                text.style.borderRadius = '';
                text.title = '';
            });

            // Cancel any active edits
            this.cancelAllEdits();

            // Hide edit mode notification
            this.hideEditModeNotification();
        }

        console.log(`Edit mode ${this.editMode ? 'activated' : 'deactivated'}`);
    }

    showEditModeNotification() {
        // Remove existing notification
        const existing = document.getElementById('editModeNotification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.id = 'editModeNotification';
        notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            color: #155724;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 600;
            font-size: 0.9rem;
            border: 1px solid #c3e6cb;
            animation: slideInRight 0.3s ease-out;
        ">
            ✏️ Edit Mode Active - Click any text to edit it
        </div>
    `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
        document.head.appendChild(style);
        document.body.appendChild(notification);
    }

    hideEditModeNotification() {
        const notification = document.getElementById('editModeNotification');
        if (notification) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }

    // 12. BLOCKED: Transcript editing - prevent any transcript editing
editField(fieldName) {
    // BLOCK transcript editing
    if (fieldName === 'transcript') {
        alert('The transcript is read-only and cannot be edited. You can edit the Summary, Action Items, or Outline sections instead.');
        return;
    }

    console.log(`Editing field: ${fieldName}`);

    // Cancel any other active edits first
    this.cancelAllEdits();

    const field = document.getElementById(`${fieldName}Field`);
    const controls = document.getElementById(`${fieldName}Controls`);

    if (!field || !controls) {
        console.error(`Field elements not found for ${fieldName}`);
        return;
    }

    // Store original value for cancel functionality
    this.originalValues[fieldName] = this.getCurrentFieldValue(fieldName);

    // Show edit controls with animation
    field.classList.add('editing');
    controls.style.display = 'block';
    controls.style.animation = 'slideDown 0.2s ease-out';

    // Set current values in inputs
    this.setInputValues(fieldName);

    // Focus the input
    setTimeout(() => this.focusFirstInput(fieldName), 100);

    // Add escape key handler
    this.addEscapeKeyHandler(fieldName);
}

    // NEW: Escape key handler for canceling edits
    addEscapeKeyHandler(fieldName) {
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                this.cancelEdit(fieldName);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store handler to remove it later
        this.currentEscapeHandler = escapeHandler;
    }

    // IMPROVED: Better cancel functionality
    cancelEdit(fieldName) {
        const field = document.getElementById(`${fieldName}Field`);
        const controls = document.getElementById(`${fieldName}Controls`);

        if (field) {
            field.classList.remove('editing');
            // Add cancel animation
            field.style.animation = 'pulse 0.3s ease-out';
            setTimeout(() => field.style.animation = '', 300);
        }

        if (controls) {
            controls.style.animation = 'slideUp 0.2s ease-in';
            setTimeout(() => {
                controls.style.display = 'none';
                controls.style.animation = '';
            }, 200);
        }

        // Remove escape key handler
        if (this.currentEscapeHandler) {
            document.removeEventListener('keydown', this.currentEscapeHandler);
            this.currentEscapeHandler = null;
        }

        // Clear stored original value
        delete this.originalValues[fieldName];

        console.log(`Canceled editing ${fieldName}`);
    }

    // IMPROVED: Better save feedback
    async saveField(fieldName) {
        const field = document.getElementById(`${fieldName}Field`);
        const controls = document.getElementById(`${fieldName}Controls`);

        // Show saving state
        field.classList.add('field-saving');
        const saveBtn = controls.querySelector('.btn-save');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.innerHTML = '💾 Saving...';
        saveBtn.disabled = true;

        try {
            const newValue = this.getInputValue(fieldName);

            // Validate the new value
            if (!this.validateFieldValue(fieldName, newValue)) {
                throw new Error('Invalid value provided');
            }

            // Show saving modal
            this.showSaveModal(`Saving ${this.getFieldDisplayName(fieldName)}...`);

            // Update meeting object
            this.updateMeetingObject(fieldName, newValue);

            // Save to database
            await this.saveMeetingToDatabase(fieldName, newValue);

            // Update UI display
            this.updateFieldDisplay(fieldName, newValue);

            // Hide edit controls
            this.cancelEdit(fieldName);

            // Show success feedback
            this.showSuccessAnimation(field);

            this.hideSaveModal();
            console.log(`Successfully saved ${fieldName}`);

        } catch (error) {
            console.error(`Error saving ${fieldName}:`, error);
            this.showErrorAnimation(field);
            alert(`Failed to save ${this.getFieldDisplayName(fieldName)}: ${error.message}`);
        } finally {
            // Reset save button
            field.classList.remove('field-saving');
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
            this.hideSaveModal();
        }
    }

    // 11. UPDATED: Validate field value for 3 sections
validateFieldValue(fieldName, value) {
    switch (fieldName) {
        case 'title':
            return value && value.trim().length > 0;
        case 'datetime':
            return value.date && value.time;
        case 'status':
            return ['planned', 'in-progress', 'completed', 'cancelled'].includes(value);
        case 'participants':
            // Allow empty participants array
            return Array.isArray(value);
        case 'summary':
        case 'actions':
        case 'outline':
            // Allow empty content for optional fields
            return true;
        default:
            return true;
    }
}

    cancelAllEdits() {
        const editingFields = document.querySelectorAll('.editable-field.editing');
        editingFields.forEach(field => {
            const fieldName = field.id.replace('Field', '');
            this.cancelEdit(fieldName);
        });
    }
    
    showSaveModal(message) {
        document.getElementById('saveMessage').textContent = message;
        document.getElementById('saveModal').classList.add('show');
    }
    
    hideSaveModal() {
        document.getElementById('saveModal').classList.remove('show');
    }

    // 10. UPDATED: Get field display name for 3 sections
getFieldDisplayName(fieldName) {
    const displayNames = {
        'title': 'Meeting Title',
        'agenda': 'Agenda',
        'datetime': 'Date & Time',
        'status': 'Status',
        'participants': 'Participants',
        'summary': 'Executive Summary',
        'actions': 'Action Items',
        'outline': 'Meeting Outline'
        // REMOVED: notes, decisions sections
    };
    return displayNames[fieldName] || fieldName;
}


    // NEW: Success animation
    showSuccessAnimation(field) {
        field.style.animation = 'pulse-success 0.6s ease-out';
        setTimeout(() => field.style.animation = '', 600);
    }

    // NEW: Error animation
    showErrorAnimation(field) {
        field.style.animation = 'pulse-error 0.6s ease-out';
        setTimeout(() => field.style.animation = '', 600);
    }

   


    async deleteMeeting() {
    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/meetings/${this.meetingId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Meeting deleted successfully');
            window.location.href = '/';
        } else {
            const error = await response.json();
            alert(`Failed to delete meeting: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
        alert('Failed to delete meeting. Please try again.');
    }
   }

  playAudio() {
    if (this.meeting.audio_file_path) {
        // Note: This would require serving the audio files through a static route
        alert('Audio playback feature would be implemented here.\nAudio file: ' + this.meeting.audio_file_path);
    }
}

// ===========================================
// EXISTING AUDIO RECORDING FUNCTIONALITY 
// ===========================================

setupEventListeners() {
    // Edit mode and delete buttons
    const editModeBtn = document.getElementById('editModeBtn');
    const deleteMeetingBtn = document.getElementById('deleteMeetingBtn');

    // Recording controls
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');

    if (recordButton) {
        recordButton.addEventListener('click', () => this.requestMicrophoneAndStart());
    }
    if (stopButton) {
        stopButton.addEventListener('click', () => this.stopRecording());
    }

    // File upload controls
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');

    if (uploadButton && fileInput) {
        uploadButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
                e.target.value = ''; // Reset for reuse
            }
        });
    }

    // Drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    // Download buttons
    const downloadTxt = document.getElementById('downloadTxt');
    const downloadJson = document.getElementById('downloadJson');

    if (downloadTxt) {
        downloadTxt.addEventListener('click', () => this.downloadFile('txt'));
    }
    if (downloadJson) {
        downloadJson.addEventListener('click', () => this.downloadFile('json'));
    }

    // Retry button
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
        retryButton.addEventListener('click', () => this.resetToRecording());
    }

    // Make edit functions globally available
    window.editField = (fieldName) => this.editField(fieldName);
    window.saveField = (fieldName) => this.saveField(fieldName);
    window.cancelEdit = (fieldName) => this.cancelEdit(fieldName);
    window.toggleEditMode = () => this.toggleEditMode();
    window.deleteMeeting = () => this.deleteMeeting();
    window.addParticipant = () => this.addParticipant();
    window.removeParticipant = (button) => this.removeParticipant(button);
    window.playAudio = () => this.playAudio();
}

    async checkMicrophoneAvailability() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('recordingStatus').innerHTML =
            '<span style="color: #dc3545;">❌ Microphone not supported in this browser</span>';
        document.getElementById('recordButton').disabled = true;
        return;
    }

    const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (!isSecureContext) {
        document.getElementById('recordingStatus').innerHTML =
            '<span style="color: #d97706;">⚠️ HTTPS required for microphone access</span>';
        document.getElementById('recordButton').disabled = true;
        return;
    }

    document.getElementById('recordingStatus').innerHTML =
        '<span style="color: #6c757d;">🎙️ Ready to record</span>';
    this.microphoneAvailable = true;
}

    async checkSystemStatus() {
    try {
        const response = await fetch('/health');
        const status = await response.json();

        if (!status.whisper_loaded || !status.ollama_connected) {
            let issues = [];
            if (!status.whisper_loaded) issues.push('Whisper not loaded');
            if (!status.ollama_connected) issues.push('Ollama not connected');

            console.warn('System issues:', issues.join(', '));
        }
    } catch (error) {
        console.error('Could not check system status:', error);
    }
}

    async requestMicrophoneAndStart() {
    if (!this.microphoneAvailable) {
        alert('Microphone not available');
        return;
    }

    document.getElementById('recordingStatus').innerHTML =
        '<span style="color: #007bff;">🔄 Requesting microphone permission...</span>';

    document.getElementById('recordButton').disabled = true;

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

    document.getElementById('recordingStatus').innerHTML =
        `<div style="color: #dc3545; text-align: center;">
                <div style="font-weight: 600; margin-bottom: 8px;">${errorMessage}</div>
                <div style="font-size: 0.85rem; color: #6c757d;">${helpText}</div>
            </div>`;
}

startRecordingWithStream(stream) {
    try {
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported('audio/mp4')) {
                throw new Error('No supported audio format found');
            }
        }

        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
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
            stream.getTracks().forEach(track => track.stop());
        });

        this.mediaRecorder.start(1000);
        this.updateRecordingUI(true);
        this.startTimer();

        document.getElementById('recordButton').disabled = false;

    } catch (error) {
        console.error('Error starting MediaRecorder:', error);
        this.handleRecordingError(error);
        stream.getTracks().forEach(track => track.stop());
    }
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
        }
    }
}

updateRecordingUI(recording) {
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const timer = document.getElementById('recordingTimer');

    if (recording) {
        recordButton.style.display = 'none';
        stopButton.style.display = 'inline-flex';
        timer.style.display = 'block';
        recordingStatus.innerHTML =
            '<span style="color: #dc3545; font-weight: 600;">🔴 Recording... Speak clearly</span>';
    } else {
        recordButton.style.display = 'inline-flex';
        stopButton.style.display = 'none';
        timer.style.display = 'none';

        if (this.audioChunks.length > 0) {
            recordingStatus.innerHTML =
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

handleRecordingError(error) {
    this.isRecording = false;
    this.updateRecordingUI(false);
    this.stopTimer();

    document.getElementById('recordingStatus').innerHTML =
        `<span style="color: #dc3545;">❌ Recording error: ${error.message}</span>`;
}

    async processRecording() {
    if (this.audioChunks.length === 0) {
        this.showError('No audio data recorded. Please try recording again.');
        return;
    }

    try {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const audioFile = new File([audioBlob], `recording_${Date.now()}.${extension}`, {
            type: mimeType
        });

        console.log(`Created audio file: ${audioFile.name}, size: ${audioFile.size} bytes`);
        await this.handleFileUpload(audioFile);

    } catch (error) {
        console.error('Error processing recording:', error);
        this.showError(`Failed to process recording: ${error.message}`);
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

    if (file.size > 100 * 1024 * 1024) {
        this.showError('File size must be less than 100MB');
        return;
    }

    if (file.size < 1000) {
        this.showError('Audio file is too small. Please record for at least a few seconds.');
        return;
    }

    // Start processing
    this.showProcessing();

    try {
        const formData = new FormData();
        formData.append('file', file);

        console.log('Uploading file to server...');
        this.startRealisticProgress();

        // Use meeting-specific endpoint
        const response = await fetch(`/api/meetings/${this.meetingId}/process-audio`, {
            method: 'POST',
            body: formData
        });

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

        this.updateProgress(5, 'Complete!');
        const result = await response.json();
        this.currentSessionId = result.meeting_id;

        console.log('🎉 Processing completed successfully');
        console.log('🎉 Result data:', result);

        // Update meeting status in database
        console.log('🔄 Updating meeting status to completed...');
        await this.updateMeetingStatus('completed');
        console.log('✅ Meeting status updated');

        // Reload meeting data to get updated info
        console.log('🔄 Reloading meeting data...');
        try {
            await this.loadMeeting();
            console.log('✅ Meeting data reloaded successfully');
        } catch (error) {
            console.error('❌ Failed to reload meeting data:', error);
            // Don't let this block displaying results - use the result data instead
            console.log('⚠️ Continuing with result data instead of reloaded data');
        }

        console.log('⏰ Waiting 1.5s before displaying results...');
        setTimeout(() => {
            console.log('🎯 Displaying results now...');
            this.displayResults(result);
        }, 1500);

    } catch (error) {
        console.error('Processing error:', error);
        this.stopProgressSimulation();
        this.showError(`Processing failed: ${error.message}`);
    }
}

    async updateMeetingStatus(status) {
    try {
        await fetch(`/api/meetings/${this.meetingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
    } catch (error) {
        console.warn('Could not update meeting status:', error);
    }
}

startRealisticProgress() {
    this.currentStep = 1;
    this.updateProgress(1, 'Uploading file...');

    const progressSteps = [
        { step: 2, delay: 2000, message: 'Converting audio...' },
        { step: 3, delay: 5000, message: 'Transcribing speech...' },
        { step: 4, delay: 15000, message: 'Analyzing content...' },
    ];

    progressSteps.forEach(({ step, delay, message }) => {
        setTimeout(() => {
            if (this.processingInterval !== null) {
                this.currentStep = step;
                this.updateProgress(step, message);
            }
        }, delay);
    });
}

stopProgressSimulation() {
    this.processingInterval = null;
}

showSection(sectionId) {
    console.log(`🔄 Showing section: ${sectionId}`);
    const sections = ['recordingSection', 'processingSection', 'errorSection', 'resultsSection'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
            console.log(`🔄 Hidden section: ${id}`);
        } else {
            console.warn(`⚠️ Section not found: ${id}`);
        }
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log(`✅ Shown section: ${sectionId}`);
    } else {
        console.error(`❌ Target section not found: ${sectionId}`);
    }
}

showProcessing() {
    this.showSection('processingSection');
    this.processingInterval = true;
    this.updateProgress(1, 'Starting...');
}

updateProgress(step, message) {
    console.log(`Progress Update: Step ${step} - ${message}`);

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

    const processingTitle = document.getElementById('processingTitle');
    const processingMessage = document.getElementById('processingMessage');

    if (processingTitle && processingMessage) {
        const messages = {
            1: { title: 'Uploading file...', msg: 'Preparing your audio file for processing' },
            2: { title: 'Converting audio...', msg: 'Optimizing audio format for transcription' },
            3: { title: 'Transcribing speech...', msg: 'Converting speech to text using AI' },
            4: { title: 'Analyzing content...', msg: 'Understanding context and extracting insights' },
            5: { title: 'Generating notes...', msg: 'Creating structured meeting documentation' }
        };

        const stepMsg = messages[step] || { title: 'Processing...', msg: message || 'Working on your request' };
        processingTitle.textContent = stepMsg.title;
        processingMessage.textContent = stepMsg.msg;
    }
}

showError(message) {
    this.stopProgressSimulation();
    this.stopTimer();
    this.showSection('errorSection');
    document.getElementById('errorMessage').textContent = message;
}

// 2. UPDATED: Display results with 3 sections
displayResults(data) {
    console.log('📊 DISPLAY RESULTS CALLED');
    console.log('📊 Data received:', data);
    
    try {
        this.showSection('resultsSection');
        console.log('✅ Results section shown');

        // Update stats
        const wordCountEl = document.getElementById('wordCount');
        const generatedTimeEl = document.getElementById('generatedTime');
        
        if (wordCountEl && generatedTimeEl) {
            wordCountEl.textContent = `${data.word_count} words`;
            generatedTimeEl.textContent = `Generated at ${new Date(data.generated_at).toLocaleString()}`;
            console.log('✅ Stats updated');
        } else {
            console.error('❌ Could not find wordCount or generatedTime elements');
        }

        // UPDATED: Only 3 sections + transcript
        const summaryEl = document.getElementById('summaryContent');
        const actionsEl = document.getElementById('actionItemsContent');
        const outlineEl = document.getElementById('outlineContent');
        const transcriptEl = document.getElementById('transcriptContent');
        
        if (summaryEl && actionsEl && outlineEl && transcriptEl) {
            summaryEl.textContent = data.executive_summary || 'No summary available';
            actionsEl.textContent = data.action_items || 'No action items identified';
            outlineEl.textContent = data.meeting_outline || 'No outline available';
            transcriptEl.textContent = data.transcript || 'No transcript available';
            console.log('✅ Content sections updated');
        } else {
            console.error('❌ Could not find one or more content elements:', {
                summaryEl: !!summaryEl,
                actionsEl: !!actionsEl,
                outlineEl: !!outlineEl,
                transcriptEl: !!transcriptEl
            });
        }

        this.currentData = data;
        console.log('✅ Display results completed successfully');
        
    } catch (error) {
        console.error('❌ Error in displayResults:', error);
    }
}

    async downloadFile(format) {
    if (!this.currentSessionId) {
        alert('No session data available for download');
        return;
    }

    try {
        const response = await fetch(`/api/meetings/${this.currentSessionId}/download?format=${format}`);

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.meeting.title.replace(/[^a-z0-9]/gi, '_')}_notes.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Download error:', error);
        alert(`Download failed: ${error.message}`);
    }
}

resetToRecording() {
    this.stopProgressSimulation();
    this.stopTimer();
    if (this.isRecording) {
        this.stopRecording();
    }
    this.showSection('recordingSection');
    this.currentSessionId = null;
    this.currentData = null;
    this.currentStep = 1;

    // Reset UI
    this.updateRecordingUI(false);
    document.getElementById('recordingStatus').innerHTML =
        '<span style="color: #6c757d;">🎙️ Ready to record</span>';
    document.getElementById('timerValue').textContent = '00:00';
    document.getElementById('recordButton').disabled = false;
}



}

 // Add this CSS for animations (add to your meeting.css)
 const additionalCSS = `
 @keyframes slideUp {
     from { opacity: 1; transform: translateY(0); }
     to { opacity: 0; transform: translateY(-10px); }
 }
 
 @keyframes slideOutRight {
     from { transform: translateX(0); opacity: 1; }
     to { transform: translateX(100%); opacity: 0; }
 }
 
 @keyframes pulse {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.02); }
 }
 
 .btn-edit-active {
     background: #d4edda !important;
     color: #155724 !important;
     border-color: #c3e6cb !important;
 }
 
 .edit-mode-active .editable-text {
     transition: all 0.2s ease;
     cursor: pointer;
 }
 
 .edit-mode-active .editable-text:hover {
     background: rgba(108, 123, 127, 0.1) !important;
     transform: translateY(-1px);
 }
 `;
 
     // Add the CSS to the page
     if(!document.getElementById('additional-meeting-css')) {
     const style = document.createElement('style');
     style.id = 'additional-meeting-css';
     style.textContent = additionalCSS;
     document.head.appendChild(style);
     }

     
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM LOADED - Initializing Enhanced Meeting Page...');
    console.log('🎯 Meeting page JS is loading! Check console for details.');
    new MeetingPage();
});

