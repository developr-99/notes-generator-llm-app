# 🎙️ AI-Powered Meeting Notes App

A modern, privacy-first meeting management system that automatically transcribes audio recordings and generates comprehensive meeting notes using local AI models.

## ✨ Features

### 🎯 Core Functionality
- **Audio Transcription**: Local speech-to-text using OpenAI Whisper
- **AI-Generated Notes**: Automatic summaries, action items, and meeting outlines
- **Meeting Management**: Create, edit, and organize meetings with inline editing
- **Multiple Input Methods**: Live recording or audio file upload
- **Export Options**: Download notes as TXT or JSON formats

### 🔒 Privacy & Security
- **100% Local Processing**: All AI processing happens on your machine
- **No Cloud Dependencies**: Works completely offline (except for optional Claude API)
- **Secure Storage**: Local SQLite database with no external data sharing

### 🎨 Modern UI/UX
- **React Frontend**: Clean, responsive interface built with TypeScript
- **Inline Editing**: Click-to-edit meeting details without separate edit modes
- **Professional Design**: Subtle gradients, smooth animations, and intuitive layout
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **OpenAI Whisper**: Local speech-to-text transcription
- **Ollama**: Local LLM integration (Llama 3.2)
- **SQLite**: Lightweight local database
- **Python 3.9+**: Core runtime

### Frontend
- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **CSS3**: Custom styling with CSS variables and grid/flexbox

### AI Models
- **Whisper Base**: Fast, accurate speech transcription
- **Llama 3.2**: Advanced local language model for content generation
- **Optional Claude API**: Cloud-based alternative for enhanced quality

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+**
- **Node.js 16+**
- **FFmpeg** (for audio processing)
- **Ollama** (for local AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/meeting-notes-app.git
   cd meeting-notes-app
   ```

2. **Set up Python environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

4. **Install and start Ollama**
   ```bash
   # Install Ollama (visit https://ollama.ai for platform-specific instructions)
   ollama serve
   ollama pull llama3.2
   ```

5. **Start the application**
   ```bash
   python3 main.py
   ```

6. **Access the app**
   Open http://localhost:9000 in your browser

## 📋 Usage Guide

### Creating a Meeting
1. Click "New Meeting" on the homepage
2. Fill in meeting details (title, date, time, agenda)
3. Add participants if needed
4. Save to create the meeting

### Recording & Processing
1. Open a meeting from your dashboard
2. Choose recording method:
   - **Live Recording**: Click "Start Recording" to record directly
   - **File Upload**: Upload an existing audio file
3. Wait for automatic transcription and AI processing
4. Review and edit generated notes if needed

### Managing Notes
- **Inline Editing**: Click on any field to edit directly
- **Export**: Download notes as TXT or JSON
- **Search**: Find meetings by title, content, or date
- **Filter**: Sort by status, date, or other criteria

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Optional: Claude API for enhanced AI quality
CLAUDE_API_KEY=your-claude-api-key-here

# Optional: Custom model settings
WHISPER_MODEL=base
OLLAMA_MODEL=llama3.2
```

### Model Options
- **Whisper Models**: `tiny`, `base`, `small`, `medium`, `large`
- **Ollama Models**: `llama3.2`, `mistral`, `codellama`, etc.

## 🔧 Development

### Running in Development Mode

1. **Backend Development**
   ```bash
   python3 main.py
   # Server runs on http://localhost:9000 with auto-reload
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm run dev
   # Dev server runs on http://localhost:5173
   ```

### Project Structure
```
meeting-notes-app/
├── main.py                 # FastAPI backend server
├── database.py             # SQLite database operations
├── requirements.txt        # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── styles/         # CSS styles
│   │   └── types/          # TypeScript types
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts      # Vite configuration
├── static/                 # Legacy static files
├── audio_files/            # Stored audio recordings
├── uploads/                # Temporary upload directory
└── output/                 # Generated meeting notes
```

## 🎨 Customization

### Styling
- Modify `frontend/src/styles/global.css` for global styles
- CSS variables are defined in `:root` for easy theming
- Responsive breakpoints included for mobile optimization

### AI Prompts
- Edit prompts in `main.py` under `process_meeting_transcript()`
- Customize output format and structure
- Adjust temperature and model parameters

### Database Schema
- Modify `database.py` to add custom fields
- Update TypeScript types in `frontend/src/types/`

## 🚀 Deployment

### Local Production
```bash
# Build frontend
cd frontend && npm run build && cd ..

# Run with production settings
python3 main.py
```

### Docker (Optional)
```dockerfile
# Example Dockerfile structure
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 9000
CMD ["python3", "main.py"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for all frontend code
- Add comments for complex logic
- Test on multiple browsers/devices
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI Whisper** for speech transcription
- **Ollama** for local LLM inference
- **FastAPI** for the robust backend framework
- **React** team for the excellent frontend framework
- **Anthropic** for Claude API integration option

## 📞 Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions for questions
- **Documentation**: Check our Wiki for detailed guides

## 🗺️ Roadmap

- [ ] Real-time collaboration features
- [ ] Advanced search with semantic similarity
- [ ] Calendar integration
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Custom AI model training
- [ ] Advanced analytics dashboard

---

**Made with ❤️ for better meetings and productivity**

> **Note**: This application prioritizes privacy by processing everything locally. No meeting data is sent to external servers unless you explicitly choose to use the optional Claude API integration.