// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// State management
let selectedFiles = {
    'word-to-pdf': null,
    'ppt-to-pdf': null,
    'pdf-to-word': null
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadAreas();
    initializeConvertButtons();
});

function initializeUploadAreas() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        const type = area.dataset.type;
        const fileInput = area.querySelector('.file-input');
        
        // Click to upload
        area.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0], type);
            }
        });
        
        // Drag and drop
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('drag-over');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0], type);
            }
        });
    });
}

function handleFileSelect(file, type) {
    // Validate file type
    let isValid = false;
    if (type === 'word-to-pdf' && (file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
        isValid = true;
    } else if (type === 'ppt-to-pdf' && (file.name.endsWith('.pptx') || file.name.endsWith('.ppt'))) {
        isValid = true;
    } else if (type === 'pdf-to-word' && file.name.endsWith('.pdf')) {
        isValid = true;
    }
    
    if (!isValid) {
        showToast('Invalid file type', 'error');
        return;
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File too large. Maximum size is 50MB', 'error');
        return;
    }
    
    selectedFiles[type] = file;
    updateFileInfo(type, file);
    enableConvertButton(type, true);
    showToast(`File loaded: ${file.name}`, 'success');
}

function updateFileInfo(type, file) {
    const fileInfoDiv = document.getElementById(`${type}-file-info`);
    if (fileInfoDiv) {
        fileInfoDiv.style.display = 'flex';
        fileInfoDiv.innerHTML = `
            <span>✅ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <span class="remove-file" onclick="removeFile('${type}')">✖</span>
        `;
    }
}

function removeFile(type) {
    selectedFiles[type] = null;
    const fileInfoDiv = document.getElementById(`${type}-file-info`);
    if (fileInfoDiv) {
        fileInfoDiv.style.display = 'none';
        fileInfoDiv.innerHTML = '';
    }
    const fileInput = document.querySelector(`.file-input[data-type="${type}"]`);
    if (fileInput) {
        fileInput.value = '';
    }
    enableConvertButton(type, false);
    showToast('File removed', 'info');
}

function enableConvertButton(type, enabled) {
    const button = document.querySelector(`[data-convert="${type}"]`);
    if (button) {
        button.disabled = !enabled;
    }
}

function initializeConvertButtons() {
    const convertButtons = document.querySelectorAll('[data-convert]');
    
    convertButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const conversionType = button.dataset.convert;
            const file = selectedFiles[conversionType];
            
            if (!file) {
                showToast('Please select a file first', 'error');
                return;
            }
            
            await performConversion(conversionType, file);
        });
    });
}

async function performConversion(type, file) {
    const modal = document.getElementById('status-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    
    // Show modal
    modal.classList.add('active');
    modalTitle.textContent = 'Converting...';
    modalMessage.textContent = `Processing ${file.name}`;
    
    const formData = new FormData();
    formData.append('file', file);
    
    let endpoint = '';
    let outputExtension = '';
    
    switch(type) {
        case 'word-to-pdf':
            endpoint = '/convert/word-to-pdf';
            outputExtension = '.pdf';
            break;
        case 'ppt-to-pdf':
            endpoint = '/convert/ppt-to-pdf';
            outputExtension = '.pdf';
            break;
        case 'pdf-to-word':
            endpoint = '/convert/pdf-to-word';
            outputExtension = '.docx';
            break;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }
        
        // Get the blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        a.download = `${originalName}_converted${outputExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Update modal for success
        modalTitle.textContent = 'Success!';
        modalMessage.textContent = 'Your file has been converted and downloaded';
        
        setTimeout(() => {
            modal.classList.remove('active');
        }, 2000);
        
        showToast('Conversion completed successfully!', 'success');
        
        // Reset file selection
        removeFile(type);
        
    } catch (error) {
        console.error('Conversion error:', error);
        modalTitle.textContent = 'Error';
        modalMessage.textContent = error.message;
        
        setTimeout(() => {
            modal.classList.remove('active');
        }, 3000);
        
        showToast(`Conversion failed: ${error.message}`, 'error');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span>${icons[type] || 'ℹ️'}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions global for onclick handlers
window.removeFile = removeFile;