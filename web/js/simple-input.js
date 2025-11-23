/**
 * Simple Input Handler
 * 
 * Handles the unified input flow for SCOGEN
 */

const API_BASE = '/api/v3/unified';

// Example inputs
const examples = {
    payroll: "I need a payroll system for 200 employees with attendance integration, leave management, and statutory compliance",
    inventory: "Inventory management for 3 warehouses with barcode scanning, real-time tracking, and automated reordering",
    ecommerce: "E-commerce platform with product catalog, shopping cart, payment gateway integration, and order tracking"
};

/**
 * Set example input
 */
function setExample(type) {
    const textarea = document.getElementById('input');
    if (examples[type]) {
        textarea.value = examples[type];
        textarea.focus();
    }
}

/**
 * Generate complete scope
 */
let selectedFile = null;

async function generate() {
    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const documentGrid = document.getElementById('documentGrid');

    // Check which input method is active
    const textTab = document.getElementById('textTab');
    const isTextMode = textTab ? textTab.classList.contains('active') : true;
    
    const input = document.getElementById('input').value.trim();
    const fileInput = document.getElementById('fileInput');

    // Validate input
    if (isTextMode && !input) {
        showError('Please enter your project description');
        return;
    }

    if (!isTextMode && !selectedFile) {
        showError('Please select a file to upload');
        return;
    }

    // Show loading, hide results and error
    generateBtn.disabled = true;
    loading.classList.add('active');
    results.classList.remove('active');
    error.classList.remove('active');

    try {
        let response;

        if (isTextMode) {
            // Text input mode
            response = await fetch(`${API_BASE}/expand`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ input })
            });
        } else {
            // File upload mode
            const formData = new FormData();
            formData.append('file', selectedFile);

            response = await fetch(`${API_BASE}/upload-and-expand`, {
                method: 'POST',
                body: formData
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Hide loading
        loading.classList.remove('active');

        // Redirect to review page
        if (result.scopeId) {
            window.location.href = `/review-scope.html?scopeId=${result.scopeId}`;
        } else {
            showError('Failed to get scope ID from server');
            generateBtn.disabled = false;
        }

    } catch (err) {
        console.error('Generation error:', err);
        loading.classList.remove('active');
        showError(`Failed to generate scope: ${err.message}`);
        generateBtn.disabled = false;
    }
}

/**
 * Switch between text and file input tabs
 */
function switchTab(mode) {
    const textTab = document.getElementById('textTab');
    const fileTab = document.getElementById('fileTab');
    const textBtn = document.querySelector('.tab-btn[onclick*="text"]');
    const fileBtn = document.querySelector('.tab-btn[onclick*="file"]');

    if (mode === 'text') {
        textTab.classList.add('active');
        fileTab.classList.remove('active');
        textBtn.classList.add('active');
        fileBtn.classList.remove('active');
    } else {
        textTab.classList.remove('active');
        fileTab.classList.add('active');
        textBtn.classList.remove('active');
        fileBtn.classList.add('active');
    }
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('File size exceeds 10MB limit');
            return;
        }
        
        selectedFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSelected').classList.add('active');
    }
}

/**
 * Clear selected file
 */
function clearFile() {
    selectedFile = null;
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    const fileSelected = document.getElementById('fileSelected');
    if (fileSelected) {
        fileSelected.classList.remove('active');
    }
}

/**
 * Display results (legacy - now redirects to review page)
 */
function displayResults(result) {
    // This function is kept for backward compatibility but should not be called
    // The new flow redirects to review-scope.html
    console.warn('displayResults called - this should not happen in new flow');
}

/**
 * Download PDF
 */
async function downloadPDF(projectId, type, level) {
    try {
        const url = `${API_BASE}/documents/${projectId}/${type}/${level}/pdf`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        // Get blob and create download link
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${type}_${level}_${projectId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
        console.error('Download error:', err);
        showError(`Failed to download PDF: ${err.message}`);
    }
}

/**
 * Show error message
 */
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.add('active');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        error.classList.remove('active');
    }, 5000);
}

// Allow Enter+Shift to submit
const inputEl = document.getElementById('input');
if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            generate();
        }
    });
}

/**
 * Initialize drag and drop for file upload
 */
document.addEventListener('DOMContentLoaded', () => {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');

    if (fileUploadArea && fileInput) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, () => {
                fileUploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, () => {
                fileUploadArea.classList.remove('dragover');
            }, false);
        });

        // Handle dropped files
        fileUploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                const file = files[0];
                // Validate file type
                const allowedTypes = ['.pdf', '.xlsx', '.xls', '.docx', '.doc'];
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                
                if (!allowedTypes.includes(ext)) {
                    showError('Invalid file type. Only PDF, Excel, and Word documents are allowed.');
                    return;
                }
                
                // Validate file size
                if (file.size > 10 * 1024 * 1024) {
                    showError('File size exceeds 10MB limit');
                    return;
                }
                
                fileInput.files = files;
                handleFileSelect({ target: { files: files } });
            }
        }, false);
    }
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

