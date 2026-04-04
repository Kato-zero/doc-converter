const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const { Converter } = require('pdf2docx');
require('dotenv').config();

const execPromise = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/convert', limiter);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionDir = path.join(uploadDir, req.sessionId);
        fs.ensureDirSync(sessionDir);
        cb(null, sessionDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.ms-powerpoint', // .ppt
        'application/pdf' // .pdf
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only DOC, DOCX, PPT, PPTX, and PDF are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Middleware to generate session ID
app.use((req, res, next) => {
    req.sessionId = uuidv4();
    next();
});

// Cleanup old files periodically (every hour)
setInterval(() => {
    const uploadsPath = path.join(__dirname, 'uploads');
    fs.readdir(uploadsPath, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(uploadsPath, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                // Delete files older than 1 hour
                if (now - stats.mtimeMs > 3600000) {
                    fs.remove(filePath);
                }
            });
        });
    });
}, 3600000);

// Conversion endpoints
app.post('/api/convert/word-to-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const inputPath = req.file.path;
        const outputPath = inputPath.replace(/\.(docx?|doc)$/i, '.pdf');
        
        // Use LibreOffice for conversion
        const command = `libreoffice --headless --convert-to pdf --outdir ${path.dirname(inputPath)} ${inputPath}`;
        await execPromise(command);
        
        // Check if file was created
        const expectedOutput = inputPath.replace(/\.(docx?|doc)$/i, '.pdf');
        if (!fs.existsSync(expectedOutput)) {
            throw new Error('Conversion failed');
        }
        
        // Send file
        res.download(expectedOutput, `${path.parse(req.file.originalname).name}.pdf`, (err) => {
            if (err) console.error('Download error:', err);
            // Cleanup files
            fs.remove(inputPath);
            fs.remove(expectedOutput);
        });
        
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed: ' + error.message });
    }
});

app.post('/api/convert/ppt-to-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const inputPath = req.file.path;
        const outputPath = inputPath.replace(/\.(pptx?|ppt)$/i, '.pdf');
        
        // Use LibreOffice for conversion
        const command = `libreoffice --headless --convert-to pdf --outdir ${path.dirname(inputPath)} ${inputPath}`;
        await execPromise(command);
        
        const expectedOutput = inputPath.replace(/\.(pptx?|ppt)$/i, '.pdf');
        if (!fs.existsSync(expectedOutput)) {
            throw new Error('Conversion failed');
        }
        
        res.download(expectedOutput, `${path.parse(req.file.originalname).name}.pdf`, (err) => {
            if (err) console.error('Download error:', err);
            fs.remove(inputPath);
            fs.remove(expectedOutput);
        });
        
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed: ' + error.message });
    }
});

app.post('/api/convert/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const inputPath = req.file.path;
        const outputPath = inputPath.replace(/\.pdf$/i, '.docx');
        
        // Use pdf2docx library for conversion
        const converter = new Converter();
        await converter.convert(inputPath, outputPath);
        converter.destroy();
        
        if (!fs.existsSync(outputPath)) {
            throw new Error('Conversion failed');
        }
        
        res.download(outputPath, `${path.parse(req.file.originalname).name}.docx`, (err) => {
            if (err) console.error('Download error:', err);
            fs.remove(inputPath);
            fs.remove(outputPath);
        });
        
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed: ' + error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${uploadDir}`);
});