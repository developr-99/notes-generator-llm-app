# 🎙️ Local Meeting Notes AI

A privacy-first meeting notes generator that transforms audio recordings into structured meeting documentation using local AI models. No data ever leaves your computer!

![Local Meeting Notes AI Demo](https://via.placeholder.com/800x400/4facfe/ffffff?text=Local+Meeting+Notes+AI)

## ✨ Features

### 🔒 **100% Private & Local**
- All processing happens on your machine
- No cloud dependencies or data sharing
- Your conversations stay completely private

### 🎙️ **Dual Input Methods**
- **Live Recording**: Record meetings directly in the browser
- **File Upload**: Support for MP3, WAV, M4A, FLAC, OGG, MP4, WebM

### 🤖 **AI-Powered Analysis**
- **Executive Summary**: Concise overview of key points
- **Discussion Notes**: Structured bullet points of topics covered
- **Action Items**: Extracted tasks and commitments
- **Meeting Outline**: Organized flow of the conversation
- **Full Transcript**: Complete speech-to-text conversion

### 🎨 **Professional Interface**
- Clean, modern UI design
- Real-time recording with timer
- Progress tracking during processing
- Mobile-responsive design

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- FFmpeg (for audio conversion)
- 4GB+ RAM recommended
- Microphone (for live recording)

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/local-meeting-notes-ai.git
cd local-meeting-notes-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Meeting Notes App

An intelligent meeting notes application that uses AI to transcribe and summarize your meetings. The app leverages Llama 3.1, Ollama, and OpenAI's Whisper model for accurate transcription and intelligent note-taking.

## Prerequisites

Before you begin, ensure you have the following installed on your Mac:

1. **Python 3.8+**
   ```bash
   # Check Python version
   python3 --version
   ```

2. **Homebrew** (Mac package manager)
   ```bash
   # Install Homebrew if you don't have it
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Git**
   ```bash
   # Install Git if you don't have it
   brew install git
   ```

4. **Ollama**
   ```bash
   # Install Ollama
   brew install ollama
   ```

5. **FFmpeg** (required for audio processing)
   ```bash
   # Install FFmpeg
   brew install ffmpeg
   ```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meeting-notes-app
   ```

2. **Create and activate virtual environment**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   # Install required packages
   pip install -r requirements.txt
   ```

4. **Download and setup LLM models**
   ```bash
   # Pull Llama 3.1 model
   ollama pull llama2:13b
   
   # Pull Whisper model (this will be handled automatically by the app on first run)
   ```

5. **Create necessary directories**
   ```bash
   # Create directories for audio files and outputs
   mkdir -p uploads output
   ```

## 🚀 Running the Application

### 1. Start Required Services

First, ensure all required services are running:

```bash
# Start Ollama service in a separate terminal
ollama serve

# In a new terminal, verify Ollama is running
curl http://localhost:11434/api/tags
```

### 2. Launch the Application

```bash
# Make sure you're in the project directory and virtual environment is activated
cd meeting-notes-app
source venv/bin/activate

# Start the Flask application
python main.py
```

### 3. Using the Application

1. **Access the Web Interface**
   - Open your browser and go to `http://localhost:5000`
   - You should see the application

### 4. Processing Times

- **Live Recording**: Processing starts immediately after stopping
- **File Upload**: Processing time depends on file size
  - 1-minute audio ≈ 30 seconds processing
  - 30-minute meeting ≈ 5-10 minutes processing since we are using a big LLM. (4GB in size) - Will switch to smaller models in next version. 
  - Progress bar shows current status

### 6. Stopping the Application

1. **Graceful Shutdown**
   - Press `Ctrl+C` in the terminal running the Flask app

### 7. Troubleshooting Common Issues

1. **Application Won't Start**
   ```bash
   # Check if port 5000 is in use
   lsof -i :5000
   
   # If port is in use, either:
   # a) Kill the process
   kill -9 <PID>
   # b) Or change the port in main.py
   ```

2. **Recording Issues**
   - Check microphone permissions in System Preferences
   - Ensure no other application is using the microphone
   - Try refreshing the browser if recording doesn't start

3. **Processing Errors**
   - Check available disk space
   - Verify audio file format
   - Ensure Ollama service is running
   - Check system resources (CPU/Memory usage)

4. **Browser Issues**
   - Clear browser cache
   - Try a different browser
   - Ensure JavaScript is enabled

### 8. Performance Tips

- Close other resource-intensive applications
- Keep at least 10GB free disk space
- Use wired internet connection if possible
- For long meetings, consider splitting into smaller segments
- Regular system restarts help maintain performance

## Development

### Project Structure
```
meeting-notes-app/
├── main.py              # Main application file
├── requirements.txt     # Python dependencies
├── static/             # Static files (CSS, JS, HTML)
├── uploads/            # Audio file upload directory
└── output/             # Generated output files
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]

## Support

For support, please [add your support contact information or process]