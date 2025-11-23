// Live Call JavaScript

class LiveCall {
    constructor() {
        this.isRecording = false;
        this.transcript = '';
        this.quickEstimate = null;
        this.suggestedQuestions = [];
        this.confidence = 0;
        
        this.init();
    }

    init() {
        const recordButton = document.getElementById('recordButton');
        const generateButton = document.getElementById('generateScopeButton');
        const saveButton = document.getElementById('saveDraftButton');

        recordButton.addEventListener('click', () => this.toggleRecording());
        generateButton.addEventListener('click', () => this.generateFullScope());
        saveButton.addEventListener('click', () => this.saveDraft());

        // Simulate real-time analysis (would use Web Speech API in production)
        this.simulateRealtimeAnalysis();
    }

    toggleRecording() {
        this.isRecording = !this.isRecording;
        const indicator = document.getElementById('recordingIndicator');
        const title = document.getElementById('recordingTitle');
        const button = document.getElementById('recordButton');
        const preview = document.getElementById('transcriptPreview');

        if (this.isRecording) {
            indicator.classList.add('recording');
            title.textContent = 'Recording Call';
            button.textContent = 'Stop';
            button.className = 'record-button stop';
            preview.style.display = 'block';
            this.startSimulatedRecording();
        } else {
            indicator.classList.remove('recording');
            title.textContent = 'Ready to Record';
            button.textContent = 'Start';
            button.className = 'record-button start';
            this.stopRecording();
        }
    }

    startSimulatedRecording() {
        // Simulate transcript accumulation
        this.transcriptInterval = setInterval(() => {
            const sampleTexts = [
                'We need an e-commerce platform',
                'with payment gateway integration',
                'and inventory management',
                'plus customer reviews',
                'and order tracking'
            ];
            
            const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
            this.transcript += (this.transcript ? ' ' : '') + randomText;
            
            document.getElementById('transcriptText').textContent = 
                '...' + this.transcript.slice(-150);
            
            // Analyze when transcript is long enough
            if (this.transcript.length > 50) {
                this.analyzeInRealtime();
            }
        }, 3000);
    }

    stopRecording() {
        if (this.transcriptInterval) {
            clearInterval(this.transcriptInterval);
        }
    }

    async analyzeInRealtime() {
        try {
            const response = await fetch('/api/v2/live-call/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: this.transcript })
            });

            if (response.ok) {
                const data = await response.json();
                this.quickEstimate = data.estimate;
                this.suggestedQuestions = data.questions || [];
                this.confidence = data.confidence || 0.5;
                
                this.renderEstimate();
                this.renderQuestions();
            }
        } catch (error) {
            console.error('[ERROR] Real-time analysis failed', error);
            // Fallback to simulated data
            this.simulateEstimate();
        }
    }

    simulateEstimate() {
        // Simulated estimate for demo
        this.quickEstimate = {
            weeks: 8,
            minCost: 800000,
            maxCost: 1200000,
            features: ['E-commerce', 'Payment Gateway', 'Inventory', 'Reviews', 'Order Tracking']
        };
        this.suggestedQuestions = [
            'What payment gateways do you prefer?',
            'Do you need multi-currency support?',
            'What is your expected traffic volume?'
        ];
        this.confidence = 0.65;
        
        this.renderEstimate();
        this.renderQuestions();
    }

    renderEstimate() {
        const card = document.getElementById('estimateCard');
        const confidencePercent = document.getElementById('confidencePercent');
        const confidenceFill = document.getElementById('confidenceFill');
        const timelineValue = document.getElementById('timelineValue');
        const budgetValue = document.getElementById('budgetValue');
        const featuresSection = document.getElementById('featuresSection');
        const featuresList = document.getElementById('featuresList');
        const generateButton = document.getElementById('generateScopeButton');

        if (!this.quickEstimate) return;

        card.style.display = 'block';
        
        // Update confidence
        const confidencePercentValue = (this.confidence * 100).toFixed(0);
        confidencePercent.textContent = `${confidencePercentValue}%`;
        confidenceFill.style.width = `${confidencePercentValue}%`;

        // Update metrics
        timelineValue.textContent = `${this.quickEstimate.weeks} weeks`;
        budgetValue.textContent = `₹${(this.quickEstimate.minCost / 100000).toFixed(1)}-${(this.quickEstimate.maxCost / 100000).toFixed(1)}L`;

        // Update features
        if (this.quickEstimate.features && this.quickEstimate.features.length > 0) {
            featuresSection.style.display = 'block';
            featuresList.innerHTML = this.quickEstimate.features
                .slice(0, 5)
                .map(feature => `<span class="feature-tag">${feature}</span>`)
                .join('');
        }

        // Enable generate button
        generateButton.disabled = false;
    }

    renderQuestions() {
        const card = document.getElementById('questionsCard');
        const list = document.getElementById('questionsList');

        if (this.suggestedQuestions.length === 0) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        list.innerHTML = this.suggestedQuestions
            .slice(0, 3)
            .map((question, idx) => `
                <button class="question-button" onclick="liveCall.copyQuestion('${question.replace(/'/g, "\\'")}')">
                    <span style="color: #2563eb; margin-right: 0.5rem;">${idx + 1}.</span>
                    ${question}
                    <span style="color: #60a5fa; font-size: 0.75rem; margin-left: 0.5rem;">(tap to copy)</span>
                </button>
            `)
            .join('');
    }

    copyQuestion(question) {
        navigator.clipboard.writeText(question).then(() => {
            alert('Question copied to clipboard!');
        });
    }

    async generateFullScope() {
        if (!this.quickEstimate) return;

        // Redirect to intelligent scope view
        const projectId = await this.createProjectFromTranscript();
        window.location.href = `intelligent-scope.html?projectId=${projectId}`;
    }

    async createProjectFromTranscript() {
        try {
            const response = await fetch('/api/v2/projects/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: this.transcript,
                    quickEstimate: this.quickEstimate
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.projectId;
            }
        } catch (error) {
            console.error('[ERROR] Failed to create project', error);
        }

        return 'demo';
    }

    saveDraft() {
        // Save draft to localStorage
        const draft = {
            transcript: this.transcript,
            estimate: this.quickEstimate,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('liveCallDraft', JSON.stringify(draft));
        alert('Draft saved!');
    }

    simulateRealtimeAnalysis() {
        // Simulate periodic analysis updates
        setInterval(() => {
            if (this.isRecording && this.transcript.length > 50) {
                this.confidence = Math.min(0.95, this.confidence + 0.05);
                if (this.quickEstimate) {
                    this.renderEstimate();
                }
            }
        }, 5000);
    }
}

// Initialize
let liveCall;
document.addEventListener('DOMContentLoaded', () => {
    liveCall = new LiveCall();
});

