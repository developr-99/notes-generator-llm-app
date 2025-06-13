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