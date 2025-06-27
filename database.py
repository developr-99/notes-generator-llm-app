import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import uuid

class MeetingDatabase:
    def __init__(self, db_path: str = "meetings.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create meetings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                agenda TEXT,
                scheduled_date TEXT NOT NULL,
                scheduled_time TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT DEFAULT 'planned',
                audio_file_path TEXT,
                transcript TEXT,
                executive_summary TEXT,
                discussion_notes TEXT,
                action_items TEXT,
                meeting_outline TEXT,
                word_count INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0
            )
        ''')
        
        # Create participants table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
        ''')
        
        # Create tags table for categorization
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_meeting(self, title: str, agenda: str, scheduled_date: str, 
                      scheduled_time: str, participants: List[Dict] = None, 
                      tags: List[str] = None) -> str:
        """Create a new meeting"""
        meeting_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO meetings (id, title, agenda, scheduled_date, scheduled_time, 
                                created_at, updated_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (meeting_id, title, agenda, scheduled_date, scheduled_time, now, now, 'planned'))
        
        # Add participants if provided
        if participants:
            for participant in participants:
                cursor.execute('''
                    INSERT INTO participants (meeting_id, name, email, role)
                    VALUES (?, ?, ?, ?)
                ''', (meeting_id, participant.get('name', ''), 
                     participant.get('email', ''), participant.get('role', '')))
        
        # Add tags if provided
        if tags:
            for tag in tags:
                cursor.execute('''
                    INSERT INTO tags (meeting_id, tag)
                    VALUES (?, ?)
                ''', (meeting_id, tag))
        
        conn.commit()
        conn.close()
        return meeting_id
    
    def get_meeting(self, meeting_id: str) -> Optional[Dict]:
        """Get a meeting by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get meeting details
        cursor.execute('SELECT * FROM meetings WHERE id = ?', (meeting_id,))
        meeting = cursor.fetchone()
        
        if not meeting:
            conn.close()
            return None
        
        # Convert to dictionary
        columns = [desc[0] for desc in cursor.description]
        meeting_dict = dict(zip(columns, meeting))
        
        # Get participants
        cursor.execute('SELECT name, email, role FROM participants WHERE meeting_id = ?', (meeting_id,))
        participants = [{'name': p[0], 'email': p[1], 'role': p[2]} for p in cursor.fetchall()]
        meeting_dict['participants'] = participants
        
        # Get tags
        cursor.execute('SELECT tag FROM tags WHERE meeting_id = ?', (meeting_id,))
        tags = [tag[0] for tag in cursor.fetchall()]
        meeting_dict['tags'] = tags
        
        conn.close()
        return meeting_dict
    
    def update_meeting(self, meeting_id: str, **kwargs) -> bool:
        """Update meeting details"""
        if not kwargs:
            return False
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Build update query
        set_clauses = []
        values = []
        
        for key, value in kwargs.items():
            if key in ['title', 'agenda', 'scheduled_date', 'scheduled_time', 'status',
                      'audio_file_path', 'transcript', 'executive_summary', 
                      'discussion_notes', 'action_items', 'meeting_outline',
                      'word_count', 'duration_seconds']:
                set_clauses.append(f"{key} = ?")
                values.append(value)
        
        if not set_clauses:
            conn.close()
            return False
        
        # Add updated_at
        set_clauses.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(meeting_id)
        
        query = f"UPDATE meetings SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, values)
        
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    
    def delete_meeting(self, meeting_id: str) -> bool:
        """Delete a meeting and all related data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Delete related records first
        cursor.execute('DELETE FROM participants WHERE meeting_id = ?', (meeting_id,))
        cursor.execute('DELETE FROM tags WHERE meeting_id = ?', (meeting_id,))
        cursor.execute('DELETE FROM meetings WHERE id = ?', (meeting_id,))
        
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    
    def list_meetings(self, status: str = None, limit: int = 50, offset: int = 0) -> List[Dict]:
        """List meetings with optional filtering"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM meetings'
        params = []
        
        if status:
            query += ' WHERE status = ?'
            params.append(status)
        
        query += ' ORDER BY scheduled_date DESC, scheduled_time DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        meetings = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        meeting_list = []
        
        for meeting in meetings:
            meeting_dict = dict(zip(columns, meeting))
            # Get participant count
            cursor.execute('SELECT COUNT(*) FROM participants WHERE meeting_id = ?', (meeting_dict['id'],))
            meeting_dict['participant_count'] = cursor.fetchone()[0]
            meeting_list.append(meeting_dict)
        
        conn.close()
        return meeting_list
    
    def search_meetings(self, query: str) -> List[Dict]:
        """Search meetings by title, agenda, or participants"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        search_query = '''
            SELECT DISTINCT m.* FROM meetings m
            LEFT JOIN participants p ON m.id = p.meeting_id
            WHERE m.title LIKE ? OR m.agenda LIKE ? OR p.name LIKE ?
            ORDER BY m.scheduled_date DESC
        '''
        
        search_term = f"%{query}%"
        cursor.execute(search_query, (search_term, search_term, search_term))
        meetings = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        meeting_list = [dict(zip(columns, meeting)) for meeting in meetings]
        
        conn.close()
        return meeting_list
    
    def update_meeting_participants(self, meeting_id: str, participants: List[Dict]) -> bool:
        """Update participants for a meeting - FIXED VERSION"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # First verify the meeting exists
            cursor.execute('SELECT id FROM meetings WHERE id = ?', (meeting_id,))
            if not cursor.fetchone():
                conn.close()
                return False
            
            # Delete existing participants
            cursor.execute('DELETE FROM participants WHERE meeting_id = ?', (meeting_id,))
            
            # Add new participants
            for participant in participants:
                if participant.get('name'):  # Only add if name exists
                    cursor.execute('''
                        INSERT INTO participants (meeting_id, name, email, role)
                        VALUES (?, ?, ?, ?)
                    ''', (meeting_id, 
                        participant.get('name', ''), 
                        participant.get('email', ''), 
                        participant.get('role', '')))
            
            conn.commit()
            print(f"Successfully updated {len(participants)} participants for meeting {meeting_id}")
            return True
        
        except Exception as e:
            print(f"Error updating participants: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()