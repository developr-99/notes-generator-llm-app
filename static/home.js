class MeetingManager {
    constructor() {
        this.meetings = [];
        this.filteredMeetings = [];
        this.currentEditingId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadMeetings();
        this.updateStats();
        this.setDefaultDateTime();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('newMeetingBtn').addEventListener('click', () => this.showNewMeetingModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal('newMeetingModal'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal('newMeetingModal'));
        document.getElementById('closeEditModal').addEventListener('click', () => this.hideModal('editMeetingModal'));
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.hideModal('editMeetingModal'));

        // Forms
        document.getElementById('newMeetingForm').addEventListener('submit', (e) => this.handleCreateMeeting(e));
        document.getElementById('editMeetingForm').addEventListener('submit', (e) => this.handleUpdateMeeting(e));

        // Search and filters
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sortBy').addEventListener('change', () => this.applySorting());

        // Participants
        document.getElementById('addParticipantBtn').addEventListener('click', () => this.addParticipantField());

        // Delete meeting
        document.getElementById('deleteMeetingBtn').addEventListener('click', () => this.handleDeleteMeeting());

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    setDefaultDateTime() {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 5);
        
        document.getElementById('meetingDate').value = date;
        document.getElementById('meetingTime').value = time;
    }

    showNewMeetingModal() {
        this.clearForm('newMeetingForm');
        this.setDefaultDateTime();
        this.showModal('newMeetingModal');
    }

    showEditMeetingModal(meetingId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (!meeting) return;

        this.currentEditingId = meetingId;
        
        // Populate form
        document.getElementById('editMeetingTitle').value = meeting.title;
        document.getElementById('editMeetingAgenda').value = meeting.agenda || '';
        document.getElementById('editMeetingDate').value = meeting.scheduled_date;
        document.getElementById('editMeetingTime').value = meeting.scheduled_time;
        document.getElementById('editMeetingStatus').value = meeting.status;
        
        this.showModal('editMeetingModal');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentEditingId = null;
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        form.reset();
        
        // Clear participants except first one
        const container = form.querySelector('.participants-container');
        if (container) {
            const groups = container.querySelectorAll('.participant-input-group');
            groups.forEach((group, index) => {
                if (index > 0) group.remove();
            });
            // Clear first group
            if (groups[0]) {
                groups[0].querySelectorAll('input').forEach(input => input.value = '');
            }
        }
    }

    addParticipantField() {
        const container = document.querySelector('.participants-container');
        const group = document.createElement('div');
        group.className = 'participant-input-group';
        group.innerHTML = `
            <input type="text" placeholder="Name" class="participant-name">
            <input type="email" placeholder="Email (optional)" class="participant-email">
            <input type="text" placeholder="Role" class="participant-role">
            <button type="button" class="btn-remove-participant" onclick="this.parentElement.remove()">−</button>
        `;
        container.appendChild(group);
    }

    async handleCreateMeeting(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const participants = this.collectParticipants('newMeetingForm');
        const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
        
        const meetingData = {
            title: formData.get('title'),
            agenda: formData.get('agenda') || '',
            scheduled_date: formData.get('date'),
            scheduled_time: formData.get('time'),
            participants: participants,
            tags: tags
        };

        try {
            const response = await fetch('/api/meetings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🆕 Meeting created successfully:', result);
                console.log('🆕 Meeting ID:', result.meeting_id);
                console.log('🆕 Redirecting to:', `/meeting/${result.meeting_id}`);
                
                this.hideModal('newMeetingModal');
                await this.loadMeetings();
                this.updateStats();
                
                // Redirect to meeting page
                window.location.href = `/meeting/${result.meeting_id}`;
            } else {
                const error = await response.json();
                alert(`Error creating meeting: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Failed to create meeting. Please try again.');
        }
    }

    async handleUpdateMeeting(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const meetingData = {
            title: formData.get('title'),
            agenda: formData.get('agenda') || '',
            scheduled_date: formData.get('date'),
            scheduled_time: formData.get('time'),
            status: formData.get('status')
        };

        try {
            const response = await fetch(`/api/meetings/${this.currentEditingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            if (response.ok) {
                this.hideModal('editMeetingModal');
                await this.loadMeetings();
                this.updateStats();
            } else {
                const error = await response.json();
                alert(`Error updating meeting: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error updating meeting:', error);
            alert('Failed to update meeting. Please try again.');
        }
    }

    async handleDeleteMeeting() {
        if (!this.currentEditingId) return;
        
        if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/meetings/${this.currentEditingId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.hideModal('editMeetingModal');
                await this.loadMeetings();
                this.updateStats();
            } else {
                const error = await response.json();
                alert(`Error deleting meeting: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Failed to delete meeting. Please try again.');
        }
    }

    collectParticipants(formId) {
        const form = document.getElementById(formId);
        const groups = form.querySelectorAll('.participant-input-group');
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

    async loadMeetings() {
        try {
            const response = await fetch('/api/meetings');
            if (response.ok) {
                const result = await response.json();
                this.meetings = result.meetings;
                this.filteredMeetings = [...this.meetings];
                this.renderMeetings();
            } else {
                console.error('Failed to load meetings');
            }
        } catch (error) {
            console.error('Error loading meetings:', error);
        }
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        
        if (!query) {
            this.filteredMeetings = [...this.meetings];
            this.renderMeetings();
            return;
        }

        try {
            const response = await fetch(`/api/meetings/search/${encodeURIComponent(query)}`);
            if (response.ok) {
                const result = await response.json();
                this.filteredMeetings = result.meetings;
                this.renderMeetings();
            }
        } catch (error) {
            console.error('Error searching meetings:', error);
        }
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;
        
        if (!statusFilter) {
            this.filteredMeetings = [...this.meetings];
        } else {
            this.filteredMeetings = this.meetings.filter(meeting => meeting.status === statusFilter);
        }
        
        this.applySorting();
        this.renderMeetings();
    }

    applySorting() {
        const sortBy = document.getElementById('sortBy').value;
        
        this.filteredMeetings.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(`${b.scheduled_date} ${b.scheduled_time}`) - new Date(`${a.scheduled_date} ${a.scheduled_time}`);
                case 'date_asc':
                    return new Date(`${a.scheduled_date} ${a.scheduled_time}`) - new Date(`${b.scheduled_date} ${b.scheduled_time}`);
                case 'title_asc':
                    return a.title.localeCompare(b.title);
                case 'title_desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    }

    renderMeetings() {
        const grid = document.getElementById('meetingsGrid');
        const emptyState = document.getElementById('emptyState');
        const meetingCount = document.getElementById('meetingCount');
        
        meetingCount.textContent = `${this.filteredMeetings.length} meeting${this.filteredMeetings.length !== 1 ? 's' : ''}`;
        
        if (this.filteredMeetings.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredMeetings.map(meeting => this.renderMeetingCard(meeting)).join('');
    }

    renderMeetingCard(meeting) {
        const date = new Date(`${meeting.scheduled_date} ${meeting.scheduled_time}`);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric', 
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    
        const statusClass = `status-${meeting.status}`;
        const statusText = meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1).replace('-', ' ');
        
        const hasNotes = meeting.transcript && meeting.transcript.trim().length > 0;
        const notesIcon = hasNotes ? '📝' : '⏳';
        const notesText = hasNotes ? 'Has notes' : 'No recording yet';
    
        return `
            <div class="meeting-card" onclick="console.log('🎯 CARD CLICKED:', '${meeting.id}'); console.log('🎯 NAVIGATING TO:', '/meeting/${meeting.id}'); window.location.href='/meeting/${meeting.id}';">
                <div class="meeting-header">
                    <div>
                        <div class="meeting-title">${this.escapeHtml(meeting.title)}</div>
                        <div class="meeting-datetime">${formattedDate} at ${formattedTime}</div>
                    </div>
                    <div class="meeting-actions" onclick="event.stopPropagation()">
                        <button class="btn-icon" onclick="console.log('✏️ EDIT CLICKED:', '${meeting.id}'); meetingManager.showEditMeetingModal('${meeting.id}')" title="Edit">
                            ✏️
                        </button>
                        <span class="meeting-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${meeting.agenda ? `<div class="meeting-agenda">${this.escapeHtml(meeting.agenda)}</div>` : ''}
                
                <div class="meeting-meta">
                    <span>${notesIcon} ${notesText}</span>
                    <span>${meeting.participant_count || 0} participant${(meeting.participant_count || 0) !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalMeetings = this.meetings.length;
        const plannedMeetings = this.meetings.filter(m => m.status === 'planned').length;
        const completedMeetings = this.meetings.filter(m => m.status === 'completed').length;
        
        // Calculate total hours (rough estimate based on completed meetings)
        const totalHours = completedMeetings * 1; // Assume 1 hour per meeting on average
        
        document.getElementById('totalMeetings').textContent = totalMeetings;
        document.getElementById('plannedMeetings').textContent = plannedMeetings;
        document.getElementById('completedMeetings').textContent = completedMeetings;
        document.getElementById('totalHours').textContent = totalHours;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global function for modal
function showNewMeetingModal() {
    if (window.meetingManager) {
        window.meetingManager.showNewMeetingModal();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.meetingManager = new MeetingManager();
});