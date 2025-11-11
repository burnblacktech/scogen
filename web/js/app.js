// Global state
let uploadedPdfText = null;
let uploadedExcelText = null;
let currentInputType = 'text';
let currentResult = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeInputSwitcher();
    initializeFileUploads();
    initializeOptions();
    initializeGenerateButton();
});

// Input type switcher
function initializeInputSwitcher() {
    const buttons = document.querySelectorAll('.input-type-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            switchInputType(type);
        });
    });
}

function switchInputType(type) {
    currentInputType = type;
    
    // Update button states
    document.querySelectorAll('.input-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Show/hide panels
    document.querySelectorAll('.input-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${type}-panel`).classList.add('active');
}

// File uploads
function initializeFileUploads() {
    // PDF upload
    const pdfUploadArea = document.getElementById('pdfUploadArea');
    const pdfInput = document.getElementById('pdfFile');
    
    pdfUploadArea.addEventListener('click', () => pdfInput.click());
    pdfInput.addEventListener('change', handlePdfUpload);
    
    // Drag and drop for PDF
    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#4CAF50';
        pdfUploadArea.style.background = '#f1f8f1';
    });
    
    pdfUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#ddd';
        pdfUploadArea.style.background = 'transparent';
    });
    
    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#ddd';
        pdfUploadArea.style.background = 'transparent';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            pdfInput.files = e.dataTransfer.files;
            handlePdfUpload();
        } else {
            alert('Please drop a PDF file');
        }
    });
    
    // Excel upload
    const excelUploadArea = document.getElementById('excelUploadArea');
    const excelInput = document.getElementById('excelFile');
    
    excelUploadArea.addEventListener('click', () => excelInput.click());
    excelInput.addEventListener('change', handleExcelUpload);
    
    // Drag and drop for Excel
    excelUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        excelUploadArea.style.borderColor = '#4CAF50';
        excelUploadArea.style.background = '#f1f8f1';
    });
    
    excelUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        excelUploadArea.style.borderColor = '#ddd';
        excelUploadArea.style.background = 'transparent';
    });
    
    excelUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        excelUploadArea.style.borderColor = '#ddd';
        excelUploadArea.style.background = 'transparent';
        
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            excelInput.files = e.dataTransfer.files;
            handleExcelUpload();
        } else {
            alert('Please drop an Excel file (.xlsx or .xls)');
        }
    });
}

async function handlePdfUpload() {
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const preview = document.getElementById('pdfPreview');
    const textPreview = document.getElementById('pdfTextPreview');
    
    preview.style.display = 'block';
    preview.innerHTML = '⏳ Extracting text from PDF...';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadedPdfText = result.text;
            preview.innerHTML = `✅ Extracted ${result.pages} pages, ${result.text.length} characters from "${result.filename}"`;
            
            textPreview.style.display = 'block';
            textPreview.textContent = result.text.substring(0, 500) + (result.text.length > 500 ? '\n...(truncated)' : '');
        } else {
            preview.innerHTML = `❌ Error: ${result.error}`;
            uploadedPdfText = null;
        }
    } catch (error) {
        preview.innerHTML = `❌ Upload failed: ${error.message}`;
        uploadedPdfText = null;
    }
}

async function handleExcelUpload() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const preview = document.getElementById('excelPreview');
    const textPreview = document.getElementById('excelTextPreview');
    
    preview.style.display = 'block';
    preview.innerHTML = '⏳ Parsing Excel file...';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadedExcelText = result.text;
            preview.innerHTML = `✅ Extracted ${result.rows} rows from "${result.filename}"`;
            
            textPreview.style.display = 'block';
            textPreview.textContent = result.text.substring(0, 500) + (result.text.length > 500 ? '\n...(truncated)' : '');
        } else {
            preview.innerHTML = `❌ Error: ${result.error}`;
            uploadedExcelText = null;
        }
    } catch (error) {
        preview.innerHTML = `❌ Upload failed: ${error.message}`;
        uploadedExcelText = null;
    }
}

// Options toggle
function initializeOptions() {
    const specsCheck = document.getElementById('generateSpecsCheck');
    const specsOptions = document.getElementById('specLevelOptions');
    
    specsCheck.addEventListener('change', () => {
        specsOptions.style.display = specsCheck.checked ? 'block' : 'none';
    });
    
    const costCheck = document.getElementById('generateCostProposalCheck');
    const costOptions = document.getElementById('costProposalOptions');
    
    costCheck.addEventListener('change', () => {
        costOptions.style.display = costCheck.checked ? 'block' : 'none';
    });
}

// Generate button
function initializeGenerateButton() {
    const btn = document.getElementById('generateBtn');
    btn.addEventListener('click', generateScope);
}

async function generateScope() {
    const generateBtn = document.getElementById('generateBtn');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    
    // Get input based on type
    let textInput = '';
    let pdfText = null;
    let excelText = null;
    let additionalContext = '';
    
    if (currentInputType === 'text') {
        textInput = document.getElementById('textInput').value.trim();
        if (!textInput) {
            alert('Please enter a project description');
            return;
        }
    } else if (currentInputType === 'pdf') {
        if (!uploadedPdfText) {
            alert('Please upload a PDF file first');
            return;
        }
        pdfText = uploadedPdfText;
        additionalContext = document.getElementById('pdfAdditionalContext').value.trim();
    } else if (currentInputType === 'excel') {
        if (!uploadedExcelText) {
            alert('Please upload an Excel file first');
            return;
        }
        excelText = uploadedExcelText;
        additionalContext = document.getElementById('excelAdditionalContext').value.trim();
    }
    
    // Get options
    const generateSpecs = document.getElementById('generateSpecsCheck').checked;
    const specLevel = generateSpecs ? document.querySelector('input[name="specLevel"]:checked').value : 'standard';
    const generateCostProposal = document.getElementById('generateCostProposalCheck').checked;
    const rateTier = generateCostProposal ? document.querySelector('input[name="rateTier"]:checked').value : 'avg';
    
    // Show loading with progress
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    loadingSection.classList.add('active');
    resultsSection.classList.remove('active');
    
    // Show progress indicator
    showLoadingProgress('Initializing analysis...');
    
    // Set timeout for long-running requests
    const timeoutId = setTimeout(() => {
        updateLoadingProgress('This is taking longer than usual. The system is processing all 5 steps (Trust → Enrichment → Decomposition → Risk → Scenarios)...');
    }, 10000); // Show message after 10 seconds
    
    try {
        // Collect critical project details
        const projectDetails = {
            projectScale: document.getElementById('projectScale').value, // Changed from 'scale' to 'projectScale'
            marketRegion: document.getElementById('marketRegion').value,
            maxBudget: document.getElementById('maxBudget').value.trim(), // Optional constraint
            targetDeadline: document.getElementById('targetDeadline').value.trim(), // Optional constraint
            requirements: {
                mobileApp: document.getElementById('reqMobileApp').checked,
                thirdPartyIntegrations: document.getElementById('reqThirdPartyIntegrations').checked,
                compliance: document.getElementById('reqCompliance').checked,
                multiTenant: document.getElementById('reqMultiTenant').checked,
                realTime: document.getElementById('reqRealTime').checked,
                paymentGateway: document.getElementById('reqPaymentGateway').checked
            },
            additionalConstraints: document.getElementById('additionalConstraints').value.trim()
        };
        
        // Build context string from project details
        let contextString = '';
        if (projectDetails.projectScale) contextString += `Project Scale: ${projectDetails.projectScale}. `;
        if (projectDetails.marketRegion) contextString += `Market: ${projectDetails.marketRegion}. `;
        if (projectDetails.maxBudget) contextString += `Budget Constraint: Maximum ${projectDetails.maxBudget}. `;
        if (projectDetails.targetDeadline) contextString += `Deadline Constraint: Target ${projectDetails.targetDeadline}. `;
        
        const reqList = [];
        if (projectDetails.requirements.mobileApp) reqList.push('Mobile App');
        if (projectDetails.requirements.thirdPartyIntegrations) reqList.push('Third-party Integrations');
        if (projectDetails.requirements.compliance) reqList.push('Compliance Requirements');
        if (projectDetails.requirements.multiTenant) reqList.push('Multi-tenant Architecture');
        if (projectDetails.requirements.realTime) reqList.push('Real-time Features');
        if (projectDetails.requirements.paymentGateway) reqList.push('Payment Gateway');
        if (reqList.length > 0) contextString += `Technical Requirements: ${reqList.join(', ')}. `;
        
        if (projectDetails.additionalConstraints) {
            contextString += `Additional Notes: ${projectDetails.additionalConstraints}. `;
        }
        
        // Combine context with main input
        const mainInput = currentInputType === 'text' ? textInput : additionalContext;
        const combinedInput = contextString ? `[PROJECT CONTEXT] ${contextString}\n\n[REQUIREMENTS]\n${mainInput}` : mainInput;

        const requestBody = {
            input: combinedInput,
            pdfText: pdfText,
            excelText: excelText,
            projectDetails: projectDetails, // Send structured data too
            generateSpecs: generateSpecs,
            specLevel: specLevel,
            includeReview: true, // Always include review
            generateCostProposal: generateCostProposal,
            rateTier: rateTier
        };
        
        // Update progress
        updateLoadingProgress('Analyzing requirements and generating scenarios...');
        
        const response = await fetch('/api/scope', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        updateLoadingProgress('Processing results...');
        const result = await response.json();
        
        clearTimeout(timeoutId);
        
        if (result.success) {
            currentResult = result;
            updateLoadingProgress('Finalizing...');
            displayResults(result);
        } else {
            hideLoadingProgress();
            showError('Error: ' + (result.error || 'Unknown error'), result.code);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        hideLoadingProgress();
        
        // Handle timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            showError('Request timed out. The analysis is taking longer than expected. Please try again or contact support.', 'TIMEOUT');
        } else {
            showError('Failed to generate scope: ' + error.message, 'REQUEST_ERROR');
        }
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Scope & Estimate';
        loadingSection.classList.remove('active');
        if (currentResult && currentResult.success) {
            resultsSection.classList.add('active');
        }
    }
}

// Loading progress helpers
function showLoadingProgress(message) {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) {
        const progressText = loadingSection.querySelector('p') || document.createElement('p');
        progressText.textContent = message;
        progressText.style.color = '#666';
        progressText.style.fontSize = '16px';
        if (!loadingSection.querySelector('p')) {
            loadingSection.appendChild(progressText);
        }
    }
}

function updateLoadingProgress(message) {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) {
        const progressText = loadingSection.querySelector('p');
        if (progressText) {
            progressText.textContent = message;
        } else {
            showLoadingProgress(message);
        }
    }
}

function hideLoadingProgress() {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) {
        loadingSection.classList.remove('active');
    }
}

// Error display helper
function showError(message, code) {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'result-card';
        errorDiv.style.background = '#ffebee';
        errorDiv.style.borderLeft = '4px solid #f44336';
        errorDiv.innerHTML = `
            <h2 style="color: #d32f2f; margin-bottom: 10px;">❌ Error</h2>
            <p style="color: #666; margin-bottom: 10px;">${message}</p>
            ${code ? `<p style="font-size: 12px; color: #999;">Error Code: ${code}</p>` : ''}
            <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 15px;">
                Try Again
            </button>
        `;
        resultsSection.innerHTML = '';
        resultsSection.appendChild(errorDiv);
        resultsSection.classList.add('active');
    } else {
        alert(message);
    }
}

function displayResults(result) {
    // Check for enhanced routing response (trust scoring & smart routing)
    if (result.action && result.action !== 'FULL_ANALYSIS') {
        handleRoutingResponse(result);
        return;
    }
    
    // Check if this is a clarification response
    if (result.status === 'needs-clarification' || result.status === 'needs-quick-clarification') {
        displayClarification(result);
        return;
    }
    
    // Display client profile if available
    if (result.clientProfile) {
        displayClientProfile(result.clientProfile);
    }
    
    displayScopeSummary(result);
    
    // Display technical decomposition if available (from Step 3)
    if (result.technicalDecomposition) {
        displayTechnicalDecomposition(result.technicalDecomposition, result.presentations, result.resourceBasedEstimate);
    }
    
    // Display risk assessment if available (from Step 4)
    if (result.riskAssessment) {
        displayRiskAssessment(result.riskAssessment, result.riskPresentations, result.riskAdjustedEstimate);
    }
    
    // Display scenarios if available (from Step 5)
    if (result.scenarios) {
        displayScenarios(result.scenarios);
    }
    
    if (result.assumptions) {
        displayAssumptions(result.assumptions);
    }
    
    if (result.hiddenCosts) {
        displayHiddenCosts(result.hiddenCosts, result.clientProfile);
    }
    
    if (result.scopeReview) {
        displayScopeReview(result.scopeReview);
    }
    
    if (result.costProposal) {
        displayCostProposal(result.costProposal);
    }
    
    if (result.specs) {
        displayTechnicalSpecs(result.specs);
    }
    
    // Display trust metadata if available
    if (result.metadata) {
        displayTrustMetadata(result.metadata);
    }
    
    // Display warnings if available
    if (result.warnings && result.warnings.length > 0) {
        displayWarnings(result.warnings);
    }
}

function displayScopeSummary(result) {
    const container = document.getElementById('scopeSummary');
    
    const output = result.output || {};
    const summary = output.conversationalOutput?.summary || output.summary || 'Scope generated successfully';
    const technical = result.technical || {};
    const plan = technical.plan || {};
    const estimate = technical.estimate || {};
    
    let html = `
        <h2>📋 Scope Summary</h2>
        <div style="white-space: pre-wrap; line-height: 1.6; margin-top: 15px; margin-bottom: 20px;">
            ${escapeHtml(summary)}
        </div>
    `;
    
    if (estimate.timeline || estimate.cost) {
        const estimateSource = result.technical?.estimateSource || 'base';
        const sourceLabels = {
            'risk-adjusted': '⭐ Risk-Adjusted Estimate',
            'baseline': '📊 Baseline Estimate',
            'resource-based': '🔧 Resource-Based Estimate',
            'base': '📋 Base Estimate'
        };
        const sourceLabel = sourceLabels[estimateSource] || '📋 Estimate';
        
        html += `
            <div style="margin: 20px 0;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${sourceLabel}
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        `;
        
        if (estimate.timeline) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Timeline</div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        ${estimate.timeline.weeks || 0} weeks
                        ${estimate.timeline.days ? `(${estimate.timeline.days} days)` : ''}
                    </div>
                </div>
            `;
        }
        
        if (estimate.cost) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Cost</div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        ${formatCurrency(estimate.cost.total || 0)}
                    </div>
                </div>
            `;
        }
        
        if (estimate.confidence) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Confidence</div>
                    <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">
                        ${Math.round((estimate.confidence.overall || 0) * 100)}%
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    html += `
        <div class="download-btns">
            <button class="btn btn-secondary" onclick="downloadJSON()">Download JSON</button>
            <button class="btn btn-secondary" onclick="downloadMarkdown()">Download Markdown</button>
        </div>
    `;
    
    container.innerHTML = html;
}

function displayScopeReview(review) {
    const container = document.getElementById('scopeReview');
    container.style.display = 'block';
    
    const scores = review.scores || {};
    const issues = review.issues || {};
    const adjusted = review.adjustedEstimate || {};
    
    let issuesHtml = '';
    const allIssues = [
        ...(issues.completeness || []),
        ...(issues.accuracy || []),
        ...(issues.risks || [])
    ];
    
    if (allIssues.length > 0) {
        issuesHtml = '<div class="issue-list">';
        allIssues.forEach((issue, i) => {
            const severity = issue.severity || 'medium';
            issuesHtml += `
                <div class="issue-item ${severity}">
                    <strong>${i + 1}. ${escapeHtml(issue.message || issue.description)}</strong>
                    ${issue.recommendation ? `<p style="margin-top: 8px; color: #666;"><strong>Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>` : ''}
                    ${issue.impact ? `<p style="margin-top: 5px; color: #666; font-size: 13px;">Impact: ${issue.impact.cost ? '₹' + issue.impact.cost.toLocaleString('en-IN') : ''} ${issue.impact.days ? '/ +' + issue.impact.days + ' days' : ''}</p>` : ''}
                </div>
            `;
        });
        issuesHtml += '</div>';
    } else {
        issuesHtml = '<p style="color: #4CAF50;">✅ No issues found!</p>';
    }
    
    container.innerHTML = `
        <h2>🔍 Scope Review & Assessment</h2>
        
        <div class="score-grid">
            <div class="score-item">
                <div class="score-value" style="color: ${getScoreColor(scores.completeness)}">${scores.completeness || 0}%</div>
                <div class="score-label">Completeness</div>
            </div>
            <div class="score-item">
                <div class="score-value" style="color: ${getScoreColor(scores.accuracy)}">${scores.accuracy || 0}%</div>
                <div class="score-label">Accuracy</div>
            </div>
            <div class="score-item">
                <div class="score-value" style="color: ${getRiskColor(scores.riskLevel)}">${(scores.riskLevel || 'low').toUpperCase()}</div>
                <div class="score-label">Risk Level</div>
            </div>
        </div>
        
        <h3>⚠️ Issues Found (${allIssues.length})</h3>
        ${issuesHtml}
        
        ${adjusted.cost ? `
        <h3>💰 Cost Impact</h3>
        <table class="cost-table">
            <tr>
                <td>Original Estimate:</td>
                <td>₹${adjusted.cost.original.toLocaleString('en-IN')}</td>
                <td>${adjusted.timeline.original} days</td>
            </tr>
            <tr style="background: #f9f9f9;">
                <td><strong>Adjusted Estimate:</strong></td>
                <td><strong>₹${adjusted.cost.adjusted.toLocaleString('en-IN')}</strong></td>
                <td><strong>${adjusted.timeline.adjusted} days</strong></td>
            </tr>
            <tr style="color: ${adjusted.cost.delta >= 0 ? '#ff9800' : '#4CAF50'};">
                <td>Difference:</td>
                <td>${adjusted.cost.delta >= 0 ? '+' : ''}₹${adjusted.cost.delta.toLocaleString('en-IN')}</td>
                <td>${adjusted.timeline.delta >= 0 ? '+' : ''}${adjusted.timeline.delta} days</td>
            </tr>
        </table>
        ` : ''}
        
        ${review.requiresReview ? `
        <div style="margin-top: 20px; padding: 15px; background: #fff4e6; border-left: 4px solid #ff9800; border-radius: 4px;">
            <strong>⚠️ Human review recommended</strong> - Please review the issues above before proceeding.
        </div>
        ` : ''}
    `;
}

function displayCostProposal(proposal) {
    const container = document.getElementById('costProposal');
    container.style.display = 'block';
    
    const summary = proposal.summary || {};
    const breakdown = proposal.breakdown || {};
    
    container.innerHTML = `
        <h2>💰 Cost Proposal (Indian Market Rates)</h2>
        
        <div class="score-grid">
            <div class="score-item">
                <div class="score-value" style="font-size: 24px;">₹${summary.totalCost?.toLocaleString('en-IN') || '0'}</div>
                <div class="score-label">Total Cost</div>
            </div>
            <div class="score-item">
                <div class="score-value">${summary.estimatedDuration?.weeks || 0}</div>
                <div class="score-label">Weeks</div>
            </div>
            <div class="score-item">
                <div class="score-value">${summary.totalHours || 0}</div>
                <div class="score-label">Total Hours</div>
            </div>
        </div>
        
        <h3>Cost Breakdown</h3>
        <table class="cost-table">
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Development</td>
                    <td>₹${summary.developmentCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.developmentCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr>
                    <td>Overhead (EPF, ESI, Infrastructure)</td>
                    <td>₹${summary.overheadCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.overheadCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr>
                    <td>Management</td>
                    <td>₹${summary.managementCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.managementCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr>
                    <td>Testing & QA</td>
                    <td>₹${summary.testingCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.testingCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr>
                    <td>Deployment & Training</td>
                    <td>₹${summary.deploymentCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.deploymentCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr>
                    <td>Buffer/Contingency</td>
                    <td>₹${summary.bufferCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>${summary.totalCost ? Math.round(summary.bufferCost / summary.totalCost * 100) : 0}%</td>
                </tr>
                <tr class="total-row">
                    <td>Total</td>
                    <td>₹${summary.totalCost?.toLocaleString('en-IN') || '0'}</td>
                    <td>100%</td>
                </tr>
            </tbody>
        </table>
        
        ${breakdown.development?.breakdown ? `
        <h3>Resource Allocation</h3>
        <table class="cost-table">
            <thead>
                <tr>
                    <th>Module</th>
                    <th>Resource</th>
                    <th>Hours</th>
                    <th>Rate (₹/hour)</th>
                    <th>Cost</th>
                </tr>
            </thead>
            <tbody>
                ${breakdown.development.breakdown.map(item => `
                <tr>
                    <td>${escapeHtml(item.module)}</td>
                    <td>${escapeHtml(item.resource)}</td>
                    <td>${item.hours}</td>
                    <td>₹${item.rate}</td>
                    <td>₹${item.cost.toLocaleString('en-IN')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <div class="download-btns">
            <button class="btn btn-secondary" onclick="downloadProposal()">Download Proposal (Markdown)</button>
        </div>
    `;
}

function displayClarification(result) {
    const resultsSection = document.getElementById('resultsSection');
    const clarificationSection = document.getElementById('clarificationSection');
    
    if (!clarificationSection) {
        // Create clarification section if it doesn't exist
        const newSection = document.createElement('div');
        newSection.id = 'clarificationSection';
        newSection.className = 'result-section';
        resultsSection.appendChild(newSection);
        clarificationSection = newSection;
    }
    
    clarificationSection.style.display = 'block';
    resultsSection.classList.add('active');
    
    let html = `
        <h2>📋 Scope Clarification Needed</h2>
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <strong>Input Quality: ${result.quality || 0}%</strong>
            <p style="margin-top: 8px; margin-bottom: 0;">
                Your requirements need more detail for accurate estimation. We've extracted what we could and identified what's missing.
            </p>
        </div>
    `;
    
    // Display partial scope if available
    if (result.partialScope || result.extractedScope) {
        const scope = result.partialScope || result.extractedScope;
        html += `
            <h3>✅ What We Understood</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                ${scope.industry ? `<p><strong>Industry:</strong> ${escapeHtml(scope.industry)}</p>` : ''}
                ${scope.useCase ? `<p><strong>Use Case:</strong> ${escapeHtml(scope.useCase)}</p>` : ''}
                ${scope.platformType ? `<p><strong>Platform:</strong> ${escapeHtml(scope.platformType)}</p>` : ''}
                ${scope.modules && scope.modules.length > 0 ? `
                    <p><strong>Detected Modules:</strong> ${scope.modules.map(m => escapeHtml(typeof m === 'string' ? m : m.name)).join(', ')}</p>
                ` : ''}
            </div>
        `;
    }
    
    // Display missing items
    if (result.missingItems) {
        html += `
            <h3>❓ Critical Information Needed</h3>
            <div style="background: #ffe6e6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <ul style="margin: 0; padding-left: 20px;">
                    ${(result.missingItems.critical || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        `;
        
        if (result.missingItems.important && result.missingItems.important.length > 0) {
            html += `
                <h3>💡 Important Information (Recommended)</h3>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <ul style="margin: 0; padding-left: 20px;">
                        ${result.missingItems.important.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }
    
    // Display clarification document
    if (result.clarificationDoc) {
        html += `
            <h3>📄 Detailed Clarification Document</h3>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; white-space: pre-wrap; font-family: monospace; font-size: 13px; max-height: 400px; overflow-y: auto;">
                ${escapeHtml(result.clarificationDoc)}
            </div>
        `;
    }
    
    // Display template download
    if (result.suggestedTemplate) {
        html += `
            <h3>📥 Download Requirements Template</h3>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p>Download our Excel template to structure your requirements:</p>
                <a href="/api/templates/${result.suggestedTemplate}" 
                   download="${result.suggestedTemplate}"
                   class="btn btn-primary"
                   style="display: inline-block; margin-top: 10px;">
                    📥 Download ${result.suggestedTemplate}
                </a>
            </div>
        `;
    }
    
    // Display quick form for medium quality
    if (result.status === 'needs-quick-clarification' && result.quickForm) {
        html += `
            <h3>⚡ Quick Clarification Form</h3>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p>${result.quickForm.message || 'Just need a few clarifications to proceed:'}</p>
                <form id="quickClarificationForm">
                    ${(result.quickForm.questions || []).map(q => `
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                                ${escapeHtml(q.label)}
                                ${q.required ? '<span style="color: red;">*</span>' : ''}
                            </label>
                            ${q.type === 'select' ? `
                                <select name="${q.id}" ${q.required ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <option value="">Select...</option>
                                </select>
                            ` : q.type === 'radio' ? `
                                <div>
                                    <label><input type="radio" name="${q.id}" value="yes" ${q.required ? 'required' : ''}> Yes</label>
                                    <label style="margin-left: 15px;"><input type="radio" name="${q.id}" value="no" ${q.required ? 'required' : ''}> No</label>
                                </div>
                            ` : `
                                <input type="${q.type}" name="${q.id}" ${q.required ? 'required' : ''} 
                                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            `}
                        </div>
                    `).join('')}
                    <button type="button" onclick="submitQuickClarification()" class="btn btn-primary" style="margin-top: 15px;">
                        Submit & Continue
                    </button>
                </form>
            </div>
        `;
    }
    
    clarificationSection.innerHTML = html;
}

function submitQuickClarification() {
    // TODO: Implement quick clarification submission
    alert('Quick clarification form submission will be implemented. For now, please download the template and resubmit.');
}

function displayClientProfile(clientProfile) {
    const profileSection = document.getElementById('clientProfileSection');
    if (!profileSection) {
        // Create section if it doesn't exist
        const resultsSection = document.getElementById('resultsSection');
        const newSection = document.createElement('div');
        newSection.id = 'clientProfileSection';
        newSection.className = 'result-card';
        newSection.style.display = 'block';
        resultsSection.insertBefore(newSection, resultsSection.firstChild);
        profileSection = newSection;
    }
    
    profileSection.style.display = 'block';
    
    const riskColor = clientProfile.riskLevel === 'high' ? '#f44336' : 
                     clientProfile.riskLevel === 'medium' ? '#ff9800' : '#4CAF50';
    
    let html = `
        <h2>👤 Client Profile</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Tech Savvy</div>
                <div style="font-size: 18px; font-weight: bold;">${clientProfile.techSavvy.toUpperCase()}</div>
            </div>
            <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Risk Level</div>
                <div style="font-size: 18px; font-weight: bold; color: ${riskColor};">${clientProfile.riskLevel.toUpperCase()}</div>
            </div>
            <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Decision Maker</div>
                <div style="font-size: 18px; font-weight: bold;">${clientProfile.decisionMaker ? 'Yes' : 'No'}</div>
            </div>
            <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Urgency</div>
                <div style="font-size: 18px; font-weight: bold;">${clientProfile.urgency.toUpperCase()}</div>
            </div>
        </div>
    `;
    
    if (clientProfile.recommendations && clientProfile.recommendations.length > 0) {
        html += `
            <h3>💡 Recommendations</h3>
            <ul style="margin: 0; padding-left: 20px;">
                ${clientProfile.recommendations.map(rec => `<li>${escapeHtml(rec)}</li>`).join('')}
            </ul>
        `;
    }
    
    if (clientProfile.warnings && clientProfile.warnings.length > 0) {
        html += `
            <h3 style="color: #ff9800; margin-top: 20px;">⚠️ Warnings</h3>
            <ul style="margin: 0; padding-left: 20px; color: #ff9800;">
                ${clientProfile.warnings.map(warn => `<li>${escapeHtml(warn)}</li>`).join('')}
            </ul>
        `;
    }
    
    if (clientProfile.dealStructure && clientProfile.dealStructure.length > 0) {
        html += `
            <h3 style="margin-top: 20px;">📋 Deal Structure Suggestions</h3>
            <ul style="margin: 0; padding-left: 20px;">
                ${clientProfile.dealStructure.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        `;
    }
    
    profileSection.innerHTML = html;
}

function displayHiddenCosts(hiddenCosts, clientProfile) {
    const costsSection = document.getElementById('hiddenCostsSection');
    if (!costsSection) {
        const resultsSection = document.getElementById('resultsSection');
        const newSection = document.createElement('div');
        newSection.id = 'hiddenCostsSection';
        newSection.className = 'result-card';
        newSection.style.display = 'none'; // Hidden by default, show with toggle
        resultsSection.appendChild(newSection);
        costsSection = newSection;
    }
    
    // Only show if user has internal view access (for now, show to all)
    // In production, this would be role-based
    costsSection.style.display = 'block';
    
    let html = `
        <h2>💰 Cost Breakdown</h2>
        <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="showInternalView" onchange="toggleInternalView()">
                <span>Show Internal View (Real Costs)</span>
            </label>
        </div>
        
        <div id="clientCostView">
            <h3>Client-Facing Costs</h3>
            <table class="cost-table" style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f9f9f9;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Component</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Development</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${hiddenCosts.development.toLocaleString('en-IN')}</td>
                </tr>
    `;
    
    Object.entries(hiddenCosts.client.shown).forEach(([key, value]) => {
        html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatComponentName(key)}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${value.amount.toLocaleString('en-IN')}</td>
                </tr>
        `;
    });
    
    html += `
                <tr style="background: #f0f0f0; font-weight: bold;">
                    <td style="padding: 10px; border-top: 2px solid #ddd;">Total</td>
                    <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">₹${hiddenCosts.client.total.toLocaleString('en-IN')}</td>
                </tr>
            </table>
        </div>
        
        <div id="internalCostView" style="display: none;">
            <h3>Internal View (Real Costs)</h3>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ffc107;">
                <strong>⚠️ INTERNAL USE ONLY</strong>
                <p style="margin-top: 8px; margin-bottom: 0; font-size: 14px;">
                    This view shows all hidden costs including internal buffers. Do not share with client.
                </p>
            </div>
            <table class="cost-table" style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f9f9f9;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Component</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">%</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Factors</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Development</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${hiddenCosts.development.toLocaleString('en-IN')}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">-</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">-</td>
                </tr>
    `;
    
    Object.entries(hiddenCosts.breakdown).forEach(([key, value]) => {
        html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatComponentName(key)}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${value.amount.toLocaleString('en-IN')}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${value.percentage.toFixed(1)}%</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; color: #666;">
                        ${value.factors.length > 0 ? value.factors.join(', ') : '-'}
                    </td>
                </tr>
        `;
    });
    
    html += `
                <tr style="background: #f0f0f0; font-weight: bold;">
                    <td style="padding: 10px; border-top: 2px solid #ddd;">Real Total</td>
                    <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">₹${hiddenCosts.total.toLocaleString('en-IN')}</td>
                    <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">+${hiddenCosts.percentageIncrease.toFixed(1)}%</td>
                    <td style="padding: 10px; border-top: 2px solid #ddd;"></td>
                </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                <h4>Pricing Intelligence</h4>
                <p><strong>Real Cost:</strong> ₹${hiddenCosts.total.toLocaleString('en-IN')}</p>
                <p><strong>Recommended Margin:</strong> ${(hiddenCosts.internal.margin * 100).toFixed(0)}%</p>
                <p><strong>Suggested Final Quote:</strong> ₹${(hiddenCosts.total * (1 + hiddenCosts.internal.margin)).toLocaleString('en-IN')}</p>
                <p><strong>Project Risk:</strong> <span style="color: ${hiddenCosts.internal.risk === 'high' ? '#f44336' : hiddenCosts.internal.risk === 'medium' ? '#ff9800' : '#4CAF50'}">${hiddenCosts.internal.risk.toUpperCase()}</span></p>
            </div>
        </div>
    `;
    
    if (hiddenCosts.recommendations && hiddenCosts.recommendations.length > 0) {
        html += `
            <h3 style="margin-top: 20px;">💡 Cost Recommendations</h3>
            <ul style="margin: 0; padding-left: 20px;">
                ${hiddenCosts.recommendations.map(rec => `
                    <li style="color: ${rec.type === 'warning' ? '#ff9800' : '#666'};">
                        <strong>${rec.type.toUpperCase()}:</strong> ${escapeHtml(rec.message)}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    costsSection.innerHTML = html;
}

function toggleInternalView() {
    const checkbox = document.getElementById('showInternalView');
    const clientView = document.getElementById('clientCostView');
    const internalView = document.getElementById('internalCostView');
    
    if (checkbox.checked) {
        clientView.style.display = 'none';
        internalView.style.display = 'block';
    } else {
        clientView.style.display = 'block';
        internalView.style.display = 'none';
    }
}

function formatComponentName(component) {
    const names = {
        clientCoordination: 'Client Coordination',
        scopeCreep: 'Scope Creep Buffer',
        documentation: 'Documentation',
        testing: 'Testing & QA',
        deployment: 'Deployment',
        postLaunch: 'Post-Launch Support',
        projectManagement: 'Project Management',
        knowledgeTransfer: 'Knowledge Transfer'
    };
    return names[component] || component;
}

function handleRoutingResponse(result) {
    const container = document.getElementById('resultsSection');
    let html = '<div class="result-card">';
    
    // Display metadata (trust, quality, intent)
    if (result.metadata) {
        html += '<div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">';
        html += '<h3 style="margin-top: 0;">📊 Analysis Summary</h3>';
        
        if (result.metadata.trust) {
            const trustScore = result.metadata.trust.score || 0;
            const trustBadge = trustScore >= 70 ? '✅ High' : trustScore >= 40 ? '⚠️ Medium' : '❌ Low';
            html += `<p><strong>Trust Score:</strong> ${trustScore}% ${trustBadge}</p>`;
        }
        
        if (result.metadata.quality) {
            html += `<p><strong>Quality:</strong> ${result.metadata.quality.completeness || 0}% complete, ${result.metadata.quality.specificity || 0}% specific</p>`;
        }
        
        if (result.metadata.intent) {
            html += `<p><strong>Intent:</strong> ${result.metadata.intent.primary || 'unknown'}</p>`;
        }
        
        html += '</div>';
    }
    
    // Handle different action types
    switch(result.action) {
        case 'SHOW_QUESTIONS':
            html += '<h2>❓ Clarification Needed</h2>';
            html += '<p>' + (result.message || 'Please answer a few questions to proceed') + '</p>';
            
            if (result.data && result.data.questions) {
                html += '<form id="clarificationForm" style="margin-top: 20px;">';
                result.data.questions.forEach((q, idx) => {
                    html += `<div style="margin-bottom: 15px;">`;
                    html += `<label style="display: block; margin-bottom: 5px; font-weight: bold;">${q.question || q.label}</label>`;
                    
                    if (q.type === 'select' && q.options) {
                        html += `<select name="${q.field || q.name}" class="form-control" ${q.required ? 'required' : ''}>`;
                        html += `<option value="">Select...</option>`;
                        q.options.forEach(opt => {
                            html += `<option value="${opt}">${opt}</option>`;
                        });
                        html += `</select>`;
                    } else if (q.type === 'checkbox' && q.options) {
                        q.options.forEach(opt => {
                            html += `<label style="display: block; margin-left: 20px;"><input type="checkbox" name="${q.field || q.name}" value="${opt}"> ${opt}</label>`;
                        });
                    } else {
                        html += `<input type="${q.type || 'text'}" name="${q.field || q.name}" class="form-control" ${q.required ? 'required' : ''}>`;
                    }
                    
                    html += `</div>`;
                });
                html += '<button type="submit" class="btn btn-primary" style="margin-top: 10px;">Submit Answers & Continue</button>';
                html += '</form>';
                
                // Add form handler
                setTimeout(() => {
                    const form = document.getElementById('clarificationForm');
                    if (form) {
                        form.addEventListener('submit', (e) => {
                            e.preventDefault();
                            const formData = new FormData(form);
                            const answers = {};
                            for (const [key, value] of formData.entries()) {
                                answers[key] = value;
                            }
                            // TODO: Submit answers and regenerate
                            alert('Clarification answers submitted. Regenerating scope...');
                            // Could trigger a new API call with answers
                        });
                    }
                }, 100);
            }
            break;
            
        case 'SHOW_EDUCATION':
            html += '<h2>📚 Educational Resources</h2>';
            html += '<p>' + (result.message || 'Let\'s help you understand the process better') + '</p>';
            
            if (result.data && result.data.resources) {
                html += '<ul style="margin-top: 15px;">';
                result.data.resources.forEach(resource => {
                    html += `<li><a href="/api/templates/${resource}" download>${resource}</a></li>`;
                });
                html += '</ul>';
            }
            break;
            
        case 'SHOW_TEMPLATE':
            html += '<h2>📄 Template Download</h2>';
            html += '<p>' + (result.message || 'Download our template to structure your requirements') + '</p>';
            
            if (result.data && result.data.templateType) {
                html += `<div style="margin-top: 20px;">`;
                html += `<a href="/api/templates/${result.data.templateType}" class="btn btn-primary" download>Download ${result.data.templateType}</a>`;
                html += `</div>`;
            }
            break;
            
        case 'SHOW_UPLOAD':
            html += '<h2>📤 Upload Quote for Validation</h2>';
            html += '<p>' + (result.message || 'Upload the quote you want to validate') + '</p>';
            
            if (result.data && result.data.acceptTypes) {
                html += `<div style="margin-top: 20px;">`;
                html += `<input type="file" id="quoteUpload" accept="${result.data.acceptTypes.join(',')}">`;
                html += `<button onclick="uploadQuote()" class="btn btn-primary" style="margin-top: 10px;">Upload & Validate</button>`;
                html += `</div>`;
            }
            break;
            
        default:
            html += '<h2>⚠️ Action Required</h2>';
            html += '<p>' + (result.message || 'Please follow the instructions above') + '</p>';
    }
    
    // Display warnings
    if (result.warnings && result.warnings.length > 0) {
        html += '<div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">';
        html += '<h3 style="margin-top: 0;">⚠️ Warnings</h3>';
        html += '<ul>';
        result.warnings.forEach(warning => {
            html += `<li>${warning.message || warning}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function displayTrustMetadata(metadata) {
    const container = document.getElementById('resultsSection');
    let html = '<div class="result-card" style="margin-bottom: 20px;">';
    html += '<h3>📊 Trust & Quality Analysis</h3>';
    
    if (metadata.trust) {
        const trustScore = metadata.trust.score || 0;
        const trustColor = trustScore >= 70 ? '#4CAF50' : trustScore >= 40 ? '#FF9800' : '#F44336';
        html += `<p><strong>Trust Score:</strong> <span style="color: ${trustColor}; font-weight: bold;">${trustScore}%</span> (${metadata.trust.confidence || 'medium'} confidence)</p>`;
    }
    
    if (metadata.quality) {
        html += `<p><strong>Quality:</strong> ${metadata.quality.completeness || 0}% complete, ${metadata.quality.specificity || 0}% specific, ${metadata.quality.clarity || 0}% clear</p>`;
    }
    
    if (metadata.intent) {
        html += `<p><strong>Client Intent:</strong> ${metadata.intent.primary || 'unknown'} (${metadata.intent.confidence || 0}% confidence)</p>`;
    }
    
    html += '</div>';
    
    // Insert at the beginning
    const existing = container.innerHTML;
    container.innerHTML = html + existing;
}

function displayWarnings(warnings) {
    const container = document.getElementById('resultsSection');
    let html = '<div class="result-card" style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">';
    html += '<h3 style="margin-top: 0;">⚠️ Warnings</h3>';
    html += '<ul>';
    warnings.forEach(warning => {
        const message = typeof warning === 'string' ? warning : warning.message || 'Unknown warning';
        html += `<li>${message}</li>`;
    });
    html += '</ul>';
    html += '</div>';
    
    // Insert at the beginning
    const existing = container.innerHTML;
    container.innerHTML = html + existing;
}

function displayTechnicalSpecs(specs) {
    const container = document.getElementById('technicalSpecs');
    container.style.display = 'block';
    
    container.innerHTML = `
        <h2>📁 Technical Specifications</h2>
        <p><strong>Output Directory:</strong> <code>${escapeHtml(specs.outputDir || specs.localPath || 'Unknown')}</code></p>
        
        <h3>Generated Files:</h3>
        <ul style="line-height: 2;">
            ${(specs.filesWritten || []).map(file => `
                <li>📄 ${escapeHtml(file)}</li>
            `).join('')}
        </ul>
        
        <p style="margin-top: 15px; color: #666;"><em>Files saved to your Desktop. Check the directory above.</em></p>
    `;
}

function displayTechnicalDecomposition(decomposition, presentations, estimate) {
    const container = document.getElementById('resultsSection');
    if (!container) return;
    
    let html = '<div class="result-card" style="margin-bottom: 20px;">';
    html += '<h2>🔧 Technical Decomposition</h2>';
    
    if (decomposition.modules && Array.isArray(decomposition.modules)) {
        html += '<h3>Modules Breakdown</h3>';
        html += '<div style="margin-top: 15px;">';
        decomposition.modules.forEach((module, idx) => {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin-bottom: 10px;">
                    <h4 style="margin: 0 0 10px 0;">${idx + 1}. ${escapeHtml(module.name || module.module || 'Module')}</h4>
                    ${module.complexity ? `<p style="margin: 5px 0; color: #666;"><strong>Complexity:</strong> ${module.complexity}</p>` : ''}
                    ${module.estimatedDays ? `<p style="margin: 5px 0; color: #666;"><strong>Estimated Days:</strong> ${module.estimatedDays}</p>` : ''}
                    ${module.description ? `<p style="margin: 10px 0 0 0; color: #555;">${escapeHtml(module.description)}</p>` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (estimate) {
        html += '<h3 style="margin-top: 20px;">🔧 Resource-Based Estimate (Detailed Breakdown)</h3>';
        html += '<div style="font-size: 12px; color: #999; margin-bottom: 10px;">This is a detailed breakdown by resource type. The primary estimate shown above is more refined.</div>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">';
        if (estimate.cost) {
            html += `
                <div style="padding: 15px; background: #f0f0f0; border-radius: 8px; border: 1px dashed #ccc;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Resource-Based Cost</div>
                    <div style="font-size: 20px; font-weight: bold; color: #666;">
                        ₹${(estimate.cost.total || estimate.cost || 0).toLocaleString('en-IN')}
                    </div>
                </div>
            `;
        }
        if (estimate.timeline) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Timeline</div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        ${estimate.timeline.weeks || estimate.timeline.days || 0} ${estimate.timeline.weeks ? 'weeks' : 'days'}
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    // Insert after scope summary
    const existing = container.innerHTML;
    container.innerHTML = existing + html;
}

function displayRiskAssessment(riskAssessment, presentations, adjustedEstimate) {
    const container = document.getElementById('resultsSection');
    if (!container) return;
    
    let html = '<div class="result-card" style="margin-bottom: 20px;">';
    html += '<h2>⚠️ Risk Assessment</h2>';
    
    if (riskAssessment.overallRisk) {
        const riskLevel = riskAssessment.overallRisk.level || riskAssessment.overallRisk;
        const riskColor = riskLevel === 'high' ? '#f44336' : riskLevel === 'medium' ? '#ff9800' : '#4CAF50';
        html += `
            <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Overall Risk Level</div>
                <div style="font-size: 32px; font-weight: bold; color: ${riskColor};">
                    ${riskLevel.toUpperCase()}
                </div>
                ${riskAssessment.overallRisk.score ? `<div style="margin-top: 5px; color: #666;">Risk Score: ${riskAssessment.overallRisk.score}/100</div>` : ''}
            </div>
        `;
    }
    
    if (riskAssessment.risks && Array.isArray(riskAssessment.risks)) {
        html += '<h3>Identified Risks</h3>';
        html += '<div style="margin-top: 15px;">';
        riskAssessment.risks.forEach((risk, idx) => {
            const severity = risk.severity || risk.level || 'medium';
            const severityColor = severity === 'high' ? '#f44336' : severity === 'medium' ? '#ff9800' : '#4CAF50';
            html += `
                <div style="padding: 15px; background: #fff4e6; border-left: 4px solid ${severityColor}; border-radius: 4px; margin-bottom: 10px;">
                    <h4 style="margin: 0 0 10px 0; color: ${severityColor};">
                        ${idx + 1}. ${escapeHtml(risk.name || risk.risk || 'Risk')}
                        <span style="font-size: 12px; font-weight: normal; color: #666;">(${severity.toUpperCase()})</span>
                    </h4>
                    ${risk.description ? `<p style="margin: 5px 0; color: #555;">${escapeHtml(risk.description)}</p>` : ''}
                    ${risk.impact ? `<p style="margin: 5px 0; color: #666;"><strong>Impact:</strong> ${escapeHtml(risk.impact)}</p>` : ''}
                    ${risk.mitigation ? `<p style="margin: 5px 0; color: #666;"><strong>Mitigation:</strong> ${escapeHtml(risk.mitigation)}</p>` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (adjustedEstimate) {
        html += '<h3 style="margin-top: 20px;">⭐ Risk-Adjusted Estimate (Used as Primary)</h3>';
        html += '<div style="font-size: 12px; color: #999; margin-bottom: 10px;">This estimate includes risk buffers and contingency. It is used as the primary estimate shown in the summary above.</div>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">';
        if (adjustedEstimate.cost) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Adjusted Cost</div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        ₹${(adjustedEstimate.cost.total || adjustedEstimate.cost || 0).toLocaleString('en-IN')}
                    </div>
                </div>
            `;
        }
        if (adjustedEstimate.timeline) {
            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Adjusted Timeline</div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        ${adjustedEstimate.timeline.weeks || adjustedEstimate.timeline.days || 0} ${adjustedEstimate.timeline.weeks ? 'weeks' : 'days'}
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    // Insert after technical decomposition
    const existing = container.innerHTML;
    container.innerHTML = existing + html;
}

// Helper functions
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRiskColor(level) {
    if (!level) return '#666';
    if (level.toLowerCase() === 'high') return '#f44336';
    if (level.toLowerCase() === 'medium') return '#ff9800';
    return '#4CAF50';
}

function getScoreColor(score) {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
}

function formatCurrency(amount) {
    if (typeof amount === 'number') {
        return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return amount || '₹0';
}

function downloadJSON() {
    if (!currentResult) return;
    const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scope-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadMarkdown() {
    if (!currentResult) return;
    const output = currentResult.output || {};
    const markdown = output.conversationalOutput?.formatted?.markdown || output.formatted?.markdown || 'No markdown available';
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scope-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadProposal() {
    if (!currentResult || !currentResult.costProposal) return;
    
    // Generate markdown from cost proposal
    const proposal = currentResult.costProposal;
    const markdown = formatProposalMarkdown(proposal);
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-proposal-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function formatProposalMarkdown(proposal) {
    // Simple markdown formatter
    let md = `# Cost Proposal\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString('en-IN')}\n\n`;
    md += `**Total Cost:** ₹${proposal.summary.totalCost.toLocaleString('en-IN')}\n`;
    md += `**Duration:** ${proposal.summary.estimatedDuration.weeks} weeks\n`;
    md += `**Total Hours:** ${proposal.summary.totalHours}\n\n`;
    md += `---\n\n`;
    md += `## Cost Breakdown\n\n`;
    md += `| Component | Amount (₹) |\n`;
    md += `|-----------|------------|\n`;
    md += `| Development | ${proposal.summary.developmentCost.toLocaleString('en-IN')} |\n`;
    md += `| Overhead | ${proposal.summary.overheadCost.toLocaleString('en-IN')} |\n`;
    md += `| Management | ${proposal.summary.managementCost.toLocaleString('en-IN')} |\n`;
    md += `| Testing | ${proposal.summary.testingCost.toLocaleString('en-IN')} |\n`;
    md += `| Deployment | ${proposal.summary.deploymentCost.toLocaleString('en-IN')} |\n`;
    md += `| Buffer | ${proposal.summary.bufferCost.toLocaleString('en-IN')} |\n`;
    md += `| **Total** | **${proposal.summary.totalCost.toLocaleString('en-IN')}** |\n`;
    return md;
}
