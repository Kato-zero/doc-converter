# Document Converter Pro

Convert Word, PowerPoint to PDF and PDF to Word with enterprise-grade quality.

## Features

- ✅ Word (DOC/DOCX) to PDF conversion
- ✅ PowerPoint (PPT/PPTX) to PDF conversion  
- ✅ PDF to Word (DOCX) conversion
- 🔒 Secure file processing with auto-deletion
- 🚀 Supports files up to 50MB
- 🎨 Modern, responsive UI
- ⚡ Real-time conversion status

## Technology Stack

- **Backend**: Node.js, Express
- **Conversion Engine**: LibreOffice, pdf2docx
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Deployment**: GitHub + Any cloud platform (Render, Railway, Heroku)

## Installation

### Prerequisites

1. Install Node.js (v18+)
2. Install LibreOffice:
   - **Ubuntu/Debian**: `sudo apt-get install libreoffice`
   - **macOS**: `brew install libreoffice`
   - **Windows**: Download from libreoffice.org

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/document-converter.git
cd document-converter

# Install backend dependencies
cd backend
npm install

# Create .env file
echo "PORT=3001" > .env
echo "FRONTEND_URL=http://localhost:3000" >> .env

# Start backend server
npm start

# In a new terminal, serve frontend
cd ../frontend
python3 -m http.server 3000
# or use any static server