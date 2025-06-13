from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
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

# Initialize FastAPI app
app = FastAPI(title="Local Meeting Notes Generator")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global variables
whisper_model = None
OLLAMA_URL = "http://localhost:11434/api/generate"

class MeetingNotesProcessor:
    def __init__(self):
        self.load_whisper_model()
    
    def load_whisper_model(self):
        """Load Whisper model on startup"""
        global whisper_model
        try:
            print("Loading Whisper model...")
            whisper_model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
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
    
    async def query_ollama(self, prompt: str, model: str = "llama3.1:8b") -> str:
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
        """Process transcript using concise, fact-based prompts - NO HALLUCINATION"""
        
        # 1. CONCISE EXECUTIVE SUMMARY
        print("Generating executive summary...")
        summary_prompt = f"""
Analyze this meeting transcript and create a brief summary. ONLY include information that is explicitly mentioned in the transcript. Do NOT add assumptions, suggestions, or content not directly stated.

TRANSCRIPT: {transcript}

PROVIDE:

**Meeting Summary (2-3 sentences max):**
[State the main purpose and key outcomes only if clearly mentioned]

**Key Points (bullet format):**
- [Only points explicitly discussed]
- [Maximum 4-5 bullet points]
- [Direct content from transcript only]

**Decisions Made:**
- [Only decisions explicitly stated]
- [If no clear decisions, write "No specific decisions mentioned"]

Keep it brief and factual. Do not elaborate beyond what was actually said.
"""
        
        summary = await self.query_ollama(summary_prompt)
        
        # 2. DISCUSSION NOTES - FACT-BASED ONLY
        print("Extracting discussion notes...")
        notes_prompt = f"""
Extract discussion points from this meeting transcript. STRICTLY limit content to what was actually said. Do not add interpretations or assumptions.

TRANSCRIPT: {transcript}

EXTRACT ONLY:

**Topics Discussed:**
- [Topic 1: Brief description of what was actually discussed]
- [Topic 2: Brief description of what was actually discussed]
- [Maximum 5 topics]

**Important Points Mentioned:**
- [Only significant points explicitly stated]
- [Direct quotes or paraphrases of actual content]
- [Maximum 5 points]

**Questions or Issues Raised:**
- [Only questions/issues explicitly mentioned]
- [If none, write "No specific issues raised"]

Use bullet points. Be concise. Stick to facts only.
"""
        
        notes = await self.query_ollama(notes_prompt)
        
        # 3. ACTION ITEMS - ONLY EXPLICIT COMMITMENTS
        print("Identifying action items...")
        action_items_prompt = f"""
Extract action items from this meeting transcript. ONLY include tasks or commitments explicitly mentioned. Do not infer or suggest actions.

TRANSCRIPT: {transcript}

EXTRACT:

**Clear Action Items:**
1. [Task] - [Person if mentioned] - [Deadline if stated]
2. [Task] - [Person if mentioned] - [Deadline if stated]
[Maximum 5 items]

**Follow-up Items:**
- [Only explicit follow-ups mentioned]
- [If none mentioned, write "No follow-ups specified"]

**Next Steps:**
- [Only next steps explicitly discussed]
- [If none mentioned, write "No next steps defined"]

RULES:
- Only include actions explicitly committed to
- If no clear actions, write "No specific action items mentioned"
- Do not suggest or infer tasks
- Keep descriptions brief
"""
        
        action_items = await self.query_ollama(action_items_prompt)
        
        # 4. MEETING OUTLINE - SIMPLE STRUCTURE
        print("Creating meeting outline...")
        outline_prompt = f"""
Create a simple outline of this meeting based ONLY on the content flow in the transcript. Do not add structure that wasn't present.

TRANSCRIPT: {transcript}

CREATE OUTLINE:

**Meeting Flow:**
1. [First topic/section discussed]
2. [Second topic/section discussed]
3. [Third topic/section discussed]
[Maximum 5 sections]

**Key Moments:**
- [Important moments or turning points if any]
- [Keep to 3 bullet points maximum]

**Meeting Length:** [Estimate based on content depth - Short/Medium/Long]

Keep it simple and factual. Only reflect the actual flow of conversation.
"""
        
        outline = await self.query_ollama(outline_prompt)
        
       
        
        return {
            "transcript": transcript,
            "executive_summary": summary,
            "discussion_notes": notes,
            "action_items": action_items,
            "meeting_outline": outline,
            "generated_at": datetime.now().isoformat(),
            "word_count": len(transcript.split()),
            "analysis_depth": "concise_factual"
        }

    # OPTIONAL: Meeting Type Detection for Specialized Prompts
    async def detect_meeting_type(self, transcript: str) -> str:
        """Detect meeting type to use specialized prompts"""
        
        detection_prompt = f"""
Analyze this meeting transcript and classify the meeting type. Choose the best match:

**MEETING TYPES:**
1. **Sales/Customer Call** - Client discussions, demos, negotiations
2. **Team Standup/Status** - Regular team updates, sprint reviews
3. **Strategic Planning** - Long-term planning, goal setting, vision
4. **Project Review** - Project progress, issues, deliverables
5. **Decision Making** - Formal decisions, approvals, voting
6. **Brainstorming/Creative** - Idea generation, problem solving
7. **Training/Educational** - Learning, knowledge sharing
8. **Board/Executive** - Governance, high-level strategy
9. **Interview/Hiring** - Candidate interviews, hiring decisions
10. **General Business** - Mixed topics, routine business

Respond with only the meeting type name.

Meeting Transcript: {transcript[:1000]}...
"""
        
        meeting_type = await self.query_ollama(detection_prompt)
        return meeting_type.strip()

    # OPTIONAL: Specialized Prompts by Meeting Type
    async def get_specialized_prompt(self, meeting_type: str, transcript: str) -> str:
        """Get specialized prompt based on meeting type"""
        
        if "sales" in meeting_type.lower() or "customer" in meeting_type.lower():
            return f"""
You are a sales operations expert analyzing a customer interaction:

**SALES INTELLIGENCE EXTRACTION:**

**🎯 CUSTOMER QUALIFICATION (BANT):**
- **Budget:** [Financial capacity and constraints mentioned]
- **Authority:** [Decision makers and influencers identified] 
- **Need:** [Pain points and requirements discussed]
- **Timeline:** [Implementation schedule and urgency]

**💰 OPPORTUNITY ASSESSMENT:**
- Deal size potential and revenue impact
- Competitive landscape and differentiation
- Technical requirements and integration needs
- Risk factors and potential objections

**🤝 RELATIONSHIP BUILDING:**
- Stakeholder mapping and relationship status
- Trust building moments and rapport established
- Customer concerns and how they were addressed
- Next steps for relationship advancement

**📈 PIPELINE PROGRESSION:**
- Current deal stage and advancement criteria
- Proposal requirements and specifications needed
- Follow-up activities and timeline commitments
- Internal coordination and resource requirements

Generate CRM-ready insights for sales team follow-up.

Meeting Transcript: {transcript}
"""
        
        elif "standup" in meeting_type.lower() or "status" in meeting_type.lower():
            return f"""
You are an agile coach analyzing a team status meeting:

**AGILE TEAM INTELLIGENCE:**

**🏃‍♂️ SPRINT PROGRESS:**
- Stories completed vs. committed
- Work in progress and capacity utilization
- Velocity trends and estimation accuracy
- Quality metrics and technical debt

**🚧 BLOCKERS & IMPEDIMENTS:**
- Current blockers with impact assessment
- Resolution strategies and owner assignment
- Escalation needs and timeline urgency
- Dependencies on external teams or systems

**🔄 PROCESS INSIGHTS:**
- Team collaboration effectiveness
- Communication gaps or improvements needed
- Tool usage and workflow optimization
- Definition of done and quality standards

**📊 TEAM HEALTH:**
- Participation levels and engagement
- Skill development and learning needs
- Workload distribution and sustainability
- Morale indicators and team dynamics

Generate insights for scrum master and team improvement.

Meeting Transcript: {transcript}
"""
        
        else:
            # Return None to use default prompts for general meetings
            return None

# Initialize processor
processor = MeetingNotesProcessor()

@app.on_event("startup")
async def startup_event():
    """Check system requirements on startup"""
    print("🚀 Starting Meeting Notes App...")
    
    # Check if Ollama is running
    if not processor.check_ollama_connection():
        print("⚠️  Warning: Ollama is not running. Please start it with 'ollama serve'")
    else:
        print("✅ Ollama connection verified")

@app.get("/")
async def serve_frontend():
    """Serve the main application"""
    return FileResponse("static/index.html")

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

@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    """Process uploaded audio file"""
    
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
    
    # Generate unique session ID
    session_id = str(uuid.uuid4())
    
    # Create temporary file
    temp_dir = Path("uploads")
    temp_dir.mkdir(exist_ok=True)
    
    temp_audio_path = temp_dir / f"{session_id}{file_extension}"
    
    try:
        # Save uploaded file
        with open(temp_audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Convert to WAV if needed (Whisper works best with WAV)
        final_audio_path = temp_audio_path
        if file_extension != '.wav':
            wav_path = temp_dir / f"{session_id}.wav"
            try:
                subprocess.run([
                    'ffmpeg', '-i', str(temp_audio_path), 
                    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', 
                    str(wav_path)
                ], check=True, capture_output=True, text=True)
                final_audio_path = wav_path
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Audio conversion failed: {e}")
        
        # Transcribe audio
        transcript = await processor.transcribe_audio(str(final_audio_path))
        
        if not transcript.strip():
            raise HTTPException(status_code=400, detail="No speech detected in audio file")
        
        # Process transcript
        result = await processor.process_meeting_transcript(transcript)
        
        # Save results
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / f"meeting_notes_{session_id}.json"
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        
        result["session_id"] = session_id
        return result
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    finally:
        # Cleanup temporary files
        for path in [temp_audio_path, temp_dir / f"{session_id}.wav"]:
            if path.exists():
                path.unlink()

@app.get("/download/{session_id}")
async def download_notes(session_id: str, format: str = "txt"):
    """Download meeting notes in specified format with new structure"""
    
    output_file = Path("output") / f"meeting_notes_{session_id}.json"
    
    if not output_file.exists():
        raise HTTPException(status_code=404, detail="Meeting notes not found")
    
    with open(output_file) as f:
        data = json.load(f)
    
    if format == "json":
        return FileResponse(
            output_file, 
            filename=f"meeting_notes_{session_id}.json",
            media_type="application/json"
        )
    
    elif format == "txt":
    # Updated TXT format without decisions section
       txt_content = f"""PROFESSIONAL MEETING NOTES
Generated: {data['generated_at']}
Word Count: {data['word_count']} words
Analysis Depth: {data.get('analysis_depth', 'standard')}

===============================================
EXECUTIVE SUMMARY
===============================================
{data.get('executive_summary', data.get('summary', ''))}

===============================================
DETAILED DISCUSSION NOTES
===============================================
{data.get('discussion_notes', data.get('notes', ''))}

===============================================
ACTION ITEMS & COMMITMENTS
===============================================
{data['action_items']}

===============================================
MEETING STRUCTURE & OUTLINE
===============================================
{data.get('meeting_outline', data.get('outline', ''))}

===============================================
FULL TRANSCRIPT
===============================================
{data['transcript']}

===============================================
Generated by Local Meeting Notes AI
===============================================
"""    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'txt' or 'json'")

if __name__ == "__main__":
    import uvicorn
    print("Starting Meeting Notes App...")
    print("Make sure Ollama is running: ollama serve")
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=True)