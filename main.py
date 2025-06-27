from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
import whisper
import asyncio
import tempfile
import os
import json
import subprocess
import requests
from pathlib import Path
import uuid
from datetime import datetime
import shutil
from typing import List, Optional
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our database
from database import MeetingDatabase

# Initialize FastAPI app
app = FastAPI(title="Local Meeting Notes Generator")

# Mount static files for React app
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize database
db = MeetingDatabase()

# Global variables
whisper_model = None
OLLAMA_URL = "http://localhost:11434/api/generate"

# Pydantic models for API
class MeetingCreate(BaseModel):
    title: str
    agenda: str = ""
    scheduled_date: str
    scheduled_time: str
    participants: List[dict] = []
    tags: List[str] = []

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    agenda: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None

class MeetingNotesProcessor:
    def __init__(self):
        self.load_whisper_model()
    
    def load_whisper_model(self):
        """Load Whisper model on startup"""
        global whisper_model
        try:
            print("Loading Whisper model...")
            whisper_model = whisper.load_model("base")
            print("Whisper model loaded successfully!")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            raise
    
    def check_ollama_connection(self):
        """Check if Ollama is running"""
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    async def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio using Whisper"""
        try:
            print(f"Transcribing audio: {audio_path}")
            result = whisper_model.transcribe(audio_path)
            return result["text"].strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    async def query_ollama(self, prompt: str, model: str = "llama3.2") -> str:
        """Query local Ollama LLM"""
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40
                }
            }
            
            print(f"Querying Ollama with model: {model}")
            response = requests.post(OLLAMA_URL, json=payload, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "").strip()
            
        except requests.exceptions.Timeout:
            raise HTTPException(status_code=504, detail="LLM request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM processing failed: {str(e)}")

    async def process_meeting_transcript(self, transcript: str) -> dict:
        """Process transcript with only 3 sections: Summary, Action Items, Outline"""

        # 1. EXECUTIVE SUMMARY
        print("Generating executive summary...")
        summary_prompt = f"""
        You are an experienced meeting analyst. Analyze this meeting transcript and create a precise, comprehensive executive summary based ONLY on what was explicitly discussed.

        TRANSCRIPT: {transcript}

        Create a structured summary with these sections:

        **Meeting Context & Purpose:**
        - What was the stated purpose of this meeting?
        - What type of meeting was this? (standup, planning, review, etc.)
        - Who called/organized the meeting and why?

        **Key Decisions Made:**
        - List only concrete decisions that were finalized during the meeting
        - Include the reasoning behind each decision if mentioned
        - Note any decisions that were deferred or require further discussion

        **Critical Discussion Points:**
        - What were the main topics discussed?
        - What problems or challenges were identified?
        - What solutions or approaches were proposed?
        - Any concerns or objections raised?

        **Outcomes & Agreements:**
        - What was agreed upon by participants?
        - What consensus was reached on key issues?
        - Any commitments made by specific people?

        **Notable Information:**
        - Important data, metrics, or insights shared
        - Updates on ongoing projects or initiatives
        - Any announcements or communications

        RULES:
        - Use bullet points for clarity
        - Keep each point concise but informative
        - Only include information explicitly mentioned
        - If a section has no relevant content, write "None discussed"
        - Focus on business value and actionable insights
        """


        summary = await self.query_ollama(summary_prompt)

        # 2. ACTION ITEMS - Comprehensive but factual
        print("Identifying action items...")
        action_items_prompt = f"""
       You are an expert project manager. Extract ALL action items, tasks, commitments, and follow-ups from this meeting transcript. Be thorough but only include explicitly mentioned items.

        TRANSCRIPT: {transcript}

        Organize the action items into these categories:

        **🎯 IMMEDIATE ACTION ITEMS**
        Extract tasks that need to be done soon:
        • [TASK DESCRIPTION] → Assigned to: [PERSON/TEAM] → Due: [DEADLINE if mentioned]
        • [TASK DESCRIPTION] → Assigned to: [PERSON/TEAM] → Due: [DEADLINE if mentioned]
        (Include ALL explicit tasks, no matter how small)

        **📋 FOLLOW-UP TASKS**
        Extract items requiring future action or monitoring:
        • [FOLLOW-UP ITEM] → Owner: [PERSON if mentioned]
        • [FOLLOW-UP ITEM] → Owner: [PERSON if mentioned]
        (Include research, investigations, check-ins, status updates)

        **⏰ DEADLINES & TIME-SENSITIVE ITEMS**
        Extract all mentioned dates, deadlines, and time commitments:
        • [DATE/TIME] → [WHAT IS DUE] → Responsible: [PERSON]
        • [DATE/TIME] → [WHAT IS DUE] → Responsible: [PERSON]
        (Include meetings to schedule, deliverable dates, review deadlines)

        **🤝 COMMITMENTS & PROMISES**
        Extract personal commitments and promises made:
        • [PERSON] committed to: [SPECIFIC COMMITMENT]
        • [PERSON] promised to: [SPECIFIC PROMISE]
        (Include "I will...", "I'll make sure...", "I can handle...")

        **❓ PENDING DECISIONS**
        Extract decisions that were discussed but not finalized:
        • [DECISION NEEDED] → Next step: [WHAT NEEDS TO HAPPEN]
        • [DECISION NEEDED] → Next step: [WHAT NEEDS TO HAPPEN]
        (Include items tabled, requiring more info, or needing approval)

        **📞 MEETINGS & COMMUNICATION**
        Extract scheduled meetings and communication actions:
        • [MEETING/CALL] → When: [TIME if mentioned] → Participants: [WHO]
        • [COMMUNICATION TASK] → Method: [EMAIL/SLACK/etc] → Owner: [PERSON]

        EXTRACTION RULES:
        - Be comprehensive - capture every actionable item mentioned
        - Include exact quotes when people commit to something
        - If no items exist for a category, write "None identified"
        - Don't infer or suggest actions not explicitly discussed
        - Include the person's name whenever mentioned in relation to a task
        - Pay attention to phrases like "I'll", "we need to", "someone should", "let's"
        """

        action_items = await self.query_ollama(action_items_prompt)

        # 3. COMPLETE MEETING OUTLINE - Detailed structure
        print("Creating comprehensive meeting outline...")
        outline_prompt = f"""
       You are an expert meeting secretary. Create a detailed, structured outline that captures the complete flow and content of this meeting based ONLY on what actually occurred in the transcript.

        TRANSCRIPT: {transcript}

        Create a comprehensive outline following this structure:

        **📋 MEETING OVERVIEW**
        • Meeting Type: [Identify: standup, planning, review, brainstorm, etc.]
        • Primary Objective: [What was the main goal?]
        • Duration Estimate: [Based on content depth and discussion flow]
        • Meeting Style: [Formal/informal, structured/unstructured]

        **👥 PARTICIPANTS & ROLES**
        • Attendees: [List all people mentioned by name]
        • Meeting Leader/Facilitator: [Who ran the meeting?]
        • Key Contributors: [Who spoke most or provided major input?]
        • Subject Matter Experts: [Anyone providing specialized knowledge?]

        **🚀 MEETING OPENING (First 10-15% of discussion)**
        • How the meeting began
        • Agenda items announced or discussed
        • Administrative items (introductions, logistics, etc.)
        • Context setting or background information shared

        **💬 MAIN DISCUSSION FLOW**
        Organize by major topics in chronological order:

        **Topic 1: [Main subject discussed]**
        ├── Key Points Raised:
        │   • [Specific point 1]
        │   • [Specific point 2]
        ├── Challenges/Issues Identified:
        │   • [Problem or concern mentioned]
        ├── Solutions/Ideas Proposed:
        │   • [Proposed solution or approach]
        ├── Questions Asked:
        │   • [Important questions raised]
        └── Outcome: [How this topic was resolved or concluded]

        **Topic 2: [Next major subject]**
        [Same structure as Topic 1]

        [Continue for all major topics discussed]

        **🎯 DECISIONS & RESOLUTIONS**
        • **Finalized Decisions:**
          - [Decision 1]: [Details and rationale]
          - [Decision 2]: [Details and rationale]
        • **Deferred Decisions:**
          - [Decision requiring more info]: [What's needed to decide]
        • **Consensus Reached:**
          - [Areas where agreement was achieved]

        **📊 KEY INFORMATION SHARED**
        • Data/Metrics: [Numbers, statistics, performance data mentioned]
        • Updates: [Status reports, project updates, announcements]
        • Insights: [Important realizations or learnings discussed]
        • Resources: [Tools, documents, or materials referenced]

        **🚦 MEETING CONCLUSION**
        • How the meeting ended
        • Summary statements made
        • Next meeting scheduled? [Date/time if mentioned]
        • Final reminders or announcements

        **📈 MEETING OUTCOMES**
        • Primary Achievements: [What was accomplished]
        • Information Gathered: [Key learnings or data collected]
        • Relationships/Alignment: [Team dynamics, consensus building]
        • Process Improvements: [Any workflow or process discussions]

        OUTLINE RULES:
        - Follow the chronological flow of the actual conversation
        - Use exact quotes for important statements when possible
        - Include transition phrases that show how topics connected
        - Note the relative time/emphasis spent on each topic
        - Capture the meeting's energy and dynamics
        - Only include what was explicitly discussed
        - Use clear hierarchical structure with proper indentation
        """

        outline = await self.query_ollama(outline_prompt)

        return {
            "transcript": transcript,
            "executive_summary": summary,
            "action_items": action_items,
            "meeting_outline": outline,
            "generated_at": datetime.now().isoformat(),
            "word_count": len(transcript.split()),
            "analysis_depth": "comprehensive_factual"
        }


# Initialize processor
processor = MeetingNotesProcessor()

# API Routes

@app.on_event("startup")
async def startup_event():
    """Check system requirements on startup"""
    print("🚀 Starting Meeting Management System...")
    
    # Ensure directories exist
    Path("uploads").mkdir(exist_ok=True)
    Path("output").mkdir(exist_ok=True)
    Path("audio_files").mkdir(exist_ok=True)
    
    # Check if Ollama is running
    if not processor.check_ollama_connection():
        print("⚠️  Warning: Ollama is not running. Please start it with 'ollama serve'")
    else:
        print("✅ Ollama connection verified")

# MAIN PAGE ROUTES
@app.get("/")
async def serve_home():
    """Serve the React app (meeting management dashboard)"""
    return FileResponse("frontend/dist/index.html")

@app.get("/app")
async def serve_app():
    """Serve the original app page for direct audio processing"""
    return FileResponse("static/index.html")

@app.get("/meeting/{meeting_id}")
async def serve_meeting_page(meeting_id: str):
    """Serve the React app (catches React Router routes)"""
    return FileResponse("frontend/dist/index.html")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    ollama_status = processor.check_ollama_connection()
    whisper_status = whisper_model is not None
    
    return {
        "status": "healthy" if (ollama_status and whisper_status) else "degraded",
        "whisper_loaded": whisper_status,
        "ollama_connected": ollama_status,
        "timestamp": datetime.now().isoformat()
    }

# MEETING CRUD API

@app.post("/api/meetings")
async def create_meeting(meeting: MeetingCreate):
    """Create a new meeting"""
    try:
        meeting_id = db.create_meeting(
            title=meeting.title,
            agenda=meeting.agenda,
            scheduled_date=meeting.scheduled_date,
            scheduled_time=meeting.scheduled_time,
            participants=meeting.participants,
            tags=meeting.tags
        )
        return {"meeting_id": meeting_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")

@app.get("/api/meetings")
async def list_meetings(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List meetings"""
    try:
        meetings = db.list_meetings(status=status, limit=limit, offset=offset)
        return {"meetings": meetings, "total": len(meetings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list meetings: {str(e)}")

@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    """Get a specific meeting"""
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

# 1. FIXED: Update meeting function to handle participants properly
@app.put("/api/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, meeting_data: dict):
    """Update a meeting - FIXED VERSION with participants support"""
    print(f"Updating meeting {meeting_id} with data: {meeting_data}")
    
    if not meeting_data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    # Get current meeting to verify it exists
    current_meeting = db.get_meeting(meeting_id)
    if not current_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Map all possible fields that can be updated
    update_fields = {}
    
    # Basic meeting info
    if 'title' in meeting_data and meeting_data['title'] is not None:
        update_fields['title'] = meeting_data['title']
    
    if 'agenda' in meeting_data and meeting_data['agenda'] is not None:
        update_fields['agenda'] = meeting_data['agenda']
    
    if 'scheduled_date' in meeting_data and meeting_data['scheduled_date'] is not None:
        update_fields['scheduled_date'] = meeting_data['scheduled_date']
    
    if 'scheduled_time' in meeting_data and meeting_data['scheduled_time'] is not None:
        update_fields['scheduled_time'] = meeting_data['scheduled_time']
    
    if 'status' in meeting_data and meeting_data['status'] is not None:
        update_fields['status'] = meeting_data['status']
    
    # AI-generated content fields
    if 'executive_summary' in meeting_data and meeting_data['executive_summary'] is not None:
        update_fields['executive_summary'] = meeting_data['executive_summary']
  
    
    if 'action_items' in meeting_data and meeting_data['action_items'] is not None:
        update_fields['action_items'] = meeting_data['action_items']
    
    if 'meeting_outline' in meeting_data and meeting_data['meeting_outline'] is not None:
        update_fields['meeting_outline'] = meeting_data['meeting_outline']
    
    if 'transcript' in meeting_data and meeting_data['transcript'] is not None:
        update_fields['transcript'] = meeting_data['transcript']
        # Auto-update word count when transcript changes
        update_fields['word_count'] = len(meeting_data['transcript'].split())
    
    print(f"Mapped update fields: {update_fields}")
    
    # Handle participants separately if provided
    participants_updated = False
    if 'participants' in meeting_data:
        participants = meeting_data['participants']
        print(f"Updating participants: {participants}")
        
        try:
            # Use the database method to update participants
            participants_updated = db.update_meeting_participants(meeting_id, participants)
            if not participants_updated:
                print("Warning: Could not update participants")
        except Exception as e:
            print(f"Error updating participants: {e}")
    
    # Update other fields if any
    meeting_updated = False
    if update_fields:
        try:
            meeting_updated = db.update_meeting(meeting_id, **update_fields)
            if not meeting_updated:
                raise HTTPException(status_code=404, detail="Meeting not found or update failed")
            print(f"Successfully updated meeting {meeting_id}")
        except Exception as e:
            print(f"Error updating meeting: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update meeting: {str(e)}")
    
    # Return success if either participants or meeting fields were updated
    if meeting_updated or participants_updated:
        updated_items = []
        if meeting_updated:
            updated_items.extend(list(update_fields.keys()))
        if participants_updated:
            updated_items.append('participants')
        
        return {"status": "updated", "updated_fields": updated_items}
    else:
        raise HTTPException(status_code=400, detail="No valid fields to update")




@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    """Delete a meeting"""
    success = db.delete_meeting(meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"status": "deleted"}

@app.get("/api/meetings/search/{query}")
async def search_meetings(query: str):
    """Search meetings"""
    try:
        meetings = db.search_meetings(query)
        return {"meetings": meetings, "total": len(meetings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# AUDIO PROCESSING ROUTES

@app.post("/api/meetings/{meeting_id}/process-audio")
async def process_meeting_audio(meeting_id: str, file: UploadFile = File(...)):
    """Process audio for a specific meeting"""
    
    # Check if meeting exists
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4', '.webm'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Supported: {', '.join(allowed_extensions)}"
        )
    
    # Check system requirements
    if not processor.check_ollama_connection():
        raise HTTPException(status_code=503, detail="Ollama service is not available")
    
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model is not loaded")
    
    # Generate unique session ID for this processing
    session_id = str(uuid.uuid4())
    
    # Create temporary file
    temp_dir = Path("uploads")
    temp_audio_path = temp_dir / f"{session_id}{file_extension}"
    
    try:
        print(f"Processing audio for meeting: {meeting_id}")
        
        # Save uploaded file
        with open(temp_audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"Saved audio file: {temp_audio_path} ({len(content)} bytes)")
        
        # Convert to WAV if needed
        final_audio_path = temp_audio_path
        if file_extension != '.wav':
            wav_path = temp_dir / f"{session_id}.wav"
            try:
                print(f"Converting {file_extension} to WAV...")
                subprocess.run([
                    'ffmpeg', '-i', str(temp_audio_path), 
                    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', 
                    str(wav_path)
                ], check=True, capture_output=True, text=True)
                final_audio_path = wav_path
                print("Audio conversion completed")
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg error: {e}")
                raise HTTPException(status_code=500, detail=f"Audio conversion failed: {e}")
        
        # Transcribe audio
        print(f"Starting transcription of: {final_audio_path}")
        transcript = await processor.transcribe_audio(str(final_audio_path))
        
        if not transcript.strip():
            raise HTTPException(status_code=400, detail="No speech detected in audio file")
        
        print(f"Transcription completed: {len(transcript)} characters")
        
        # Process transcript
        print("Starting AI analysis...")
        result = await processor.process_meeting_transcript(transcript)
        print("AI analysis completed")
        
        # Save audio file permanently
        audio_dir = Path("audio_files")
        audio_dir.mkdir(exist_ok=True)
        permanent_audio_path = audio_dir / f"{meeting_id}{file_extension}"
        shutil.copy2(temp_audio_path, permanent_audio_path)
        print(f"Audio saved permanently: {permanent_audio_path}")
        
        # REPLACE WITH:
        update_success = db.update_meeting(
        meeting_id,
        status="completed",
        audio_file_path=str(permanent_audio_path),
        transcript=result["transcript"],
        executive_summary=result["executive_summary"],
        action_items=result["action_items"],
        meeting_outline=result["meeting_outline"],
         word_count=result["word_count"]
        )
       
        if not update_success:
            print("Warning: Could not update meeting in database")
        else:
            print("Meeting updated successfully in database")
        
        # Save results to output for download compatibility
        output_dir = Path("output")
        output_file = output_dir / f"meeting_notes_{meeting_id}.json"
        with open(output_file, "w", encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Results saved to: {output_file}")
        
        # Return result with meeting info
        result["meeting_id"] = meeting_id
        result["session_id"] = session_id
        result["meeting_title"] = meeting["title"]
        
        print("Processing completed successfully!")
        return result
        
    except Exception as e:
        print(f"Processing error: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    finally:
        # Cleanup temporary files
        for path in [temp_audio_path, temp_dir / f"{session_id}.wav"]:
            if path.exists():
                try:
                    path.unlink()
                    print(f"Cleaned up temporary file: {path}")
                except Exception as e:
                    print(f"Warning: Could not delete {path}: {e}")

@app.post("/process-audio")
async def process_audio_legacy(file: UploadFile = File(...)):
    """Legacy audio processing endpoint for direct app usage"""
    
    # For backward compatibility, create a temporary meeting
    temp_meeting_id = str(uuid.uuid4())
    now = datetime.now()
    
    # Create temporary meeting in database
    db.create_meeting(
        title=f"Quick Recording - {now.strftime('%Y-%m-%d %H:%M')}",
        agenda="Auto-generated from file upload",
        scheduled_date=now.strftime('%Y-%m-%d'),
        scheduled_time=now.strftime('%H:%M'),
        participants=[],
        tags=["quick-upload"]
    )
    
    # Process using the meeting-specific endpoint logic
    return await process_meeting_audio(temp_meeting_id, file)

# DOWNLOAD ROUTES

# 3. FIXED: Download function for 3 sections
@app.get("/api/meetings/{meeting_id}/download")
async def download_meeting_notes(meeting_id: str, format: str = "txt"):
    """Download meeting notes in specified format - UPDATED for 3 sections"""
    
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.get('transcript'):
        raise HTTPException(status_code=400, detail="Meeting has not been processed yet")
    
    if format == "json":
        # Return meeting data as JSON
        return JSONResponse(content=meeting)
    
    elif format == "txt":
        try:
            # Create formatted text file with 3 sections
            txt_content = f"""PROFESSIONAL MEETING NOTES
═══════════════════════════════════════════════════════════════

Meeting: {meeting['title']}
Date: {meeting['scheduled_date']} at {meeting['scheduled_time']}
Generated: {meeting['updated_at']}
Word Count: {meeting['word_count']} words

═══════════════════════════════════════════════════════════════
AGENDA
═══════════════════════════════════════════════════════════════
{meeting['agenda'] or 'No agenda specified'}

═══════════════════════════════════════════════════════════════
EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════
{meeting['executive_summary'] or 'No summary available'}

═══════════════════════════════════════════════════════════════
ACTION ITEMS & COMMITMENTS
═══════════════════════════════════════════════════════════════
{meeting['action_items'] or 'No action items identified'}

═══════════════════════════════════════════════════════════════
COMPLETE MEETING OUTLINE
═══════════════════════════════════════════════════════════════
{meeting['meeting_outline'] or 'No outline available'}

═══════════════════════════════════════════════════════════════
FULL TRANSCRIPT
═══════════════════════════════════════════════════════════════
{meeting['transcript'] or 'No transcript available'}

═══════════════════════════════════════════════════════════════
Generated by Local Meeting Notes AI
Privacy-First | Completely Local Processing
═══════════════════════════════════════════════════════════════
"""
            
            # Save to file
            txt_file = Path("output") / f"meeting_notes_{meeting_id}.txt"
            with open(txt_file, "w", encoding='utf-8') as f:
                f.write(txt_content)
            
            return FileResponse(
                str(txt_file),
                filename=f"{meeting['title'].replace(' ', '_')}_{meeting['scheduled_date']}.txt",
                media_type="text/plain; charset=utf-8"
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating text file: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'txt' or 'json'")


@app.get("/download/{session_id}")
async def download_notes_legacy(session_id: str, format: str = "txt"):
    """Legacy download endpoint for backward compatibility"""
    
    # Try to find meeting by session ID first, then by meeting ID
    meeting = db.get_meeting(session_id)
    if meeting:
        return await download_meeting_notes(session_id, format)
    
    # Fall back to file-based download for old sessions
    output_file = Path("output") / f"meeting_notes_{session_id}.json"
    
    if not output_file.exists():
        raise HTTPException(status_code=404, detail="Meeting notes not found")
    
    if format == "json":
        return FileResponse(str(output_file), filename=f"meeting_notes_{session_id}.json")
    
    elif format == "txt":
        try:
            # Load the JSON data
            with open(output_file, "r", encoding='utf-8') as f:
                data = json.load(f)
            
            # Create formatted text
            txt_content = f"""MEETING NOTES
Session: {session_id}
Generated: {data.get('generated_at', 'Unknown')}
Word Count: {data.get('word_count', 0)} words

===============================================
EXECUTIVE SUMMARY
===============================================
{data.get('executive_summary', 'No summary available')}

===============================================
ACTION ITEMS
===============================================
{data.get('action_items', 'No action items identified')}

===============================================
MEETING OUTLINE
===============================================
{data.get('meeting_outline', 'No outline available')}

===============================================
FULL TRANSCRIPT
===============================================
{data.get('transcript', 'No transcript available')}

===============================================
Generated by Local Meeting Notes AI
===============================================
"""
            
            # Save to temporary file
            txt_file = Path("output") / f"meeting_notes_{session_id}.txt"
            with open(txt_file, "w", encoding='utf-8') as f:
                f.write(txt_content)
            
            return FileResponse(
                str(txt_file),
                filename=f"meeting_notes_{session_id}.txt",
                media_type="text/plain; charset=utf-8"
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating text file: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'txt' or 'json'")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Meeting Management System...")
    print("📊 Home Dashboard: http://localhost:9000")
    print("🎙️ Direct App: http://localhost:9000/app")
    print("⚠️  Make sure Ollama is running: ollama serve")
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=True)