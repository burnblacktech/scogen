/**
 * Interactive Refinement Module
 * Allows real-time adjustment of constraints and assumptions
 */

let currentScenarios = null;
let currentBaseline = null;

function initializeRefinement(scenarios) {
    currentScenarios = scenarios;
    currentBaseline = scenarios.baseline;
    
    // Add refinement panel after scenarios display
    addRefinementPanel();
}

function addRefinementPanel() {
    const scenariosSection = document.getElementById('scenariosSection');
    if (!scenariosSection) return;
    
    // Check if panel already exists
    if (document.getElementById('refinementPanel')) {
        return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'refinementPanel';
    panel.style.cssText = `
        margin-top: 30px;
        padding: 25px;
        background: #f0f7ff;
        border-radius: 12px;
        border: 2px solid #4CAF50;
    `;
    
    panel.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #333; font-size: 20px;">
            🎛️ Interactive Refinement
            <span style="font-size: 14px; font-weight: normal; color: #666;">
                Adjust constraints and see scenarios update in real-time
            </span>
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <!-- Budget Slider -->
            <div>
                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #555;">
                    Maximum Budget:
                    <span id="budgetValue" style="color: #4CAF50; font-size: 18px;">₹${formatIndianCurrency(currentBaseline?.cost || 0)}</span>
                </label>
                <input 
                    type="range" 
                    id="budgetSlider" 
                    min="${Math.round((currentBaseline?.cost || 0) * 0.3)}" 
                    max="${Math.round((currentBaseline?.cost || 0) * 1.5)}" 
                    value="${currentBaseline?.cost || 0}"
                    step="10000"
                    style="width: 100%; height: 8px; border-radius: 5px; background: #ddd; outline: none;"
                    oninput="updateBudgetSlider(this.value)"
                >
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 5px;">
                    <span>₹${formatIndianCurrency(Math.round((currentBaseline?.cost || 0) * 0.3))}</span>
                    <span>₹${formatIndianCurrency(Math.round((currentBaseline?.cost || 0) * 1.5))}</span>
                </div>
            </div>
            
            <!-- Timeline Slider -->
            <div>
                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #555;">
                    Target Deadline:
                    <span id="timelineValue" style="color: #4CAF50; font-size: 18px;">${currentBaseline?.timeline || 0} weeks</span>
                </label>
                <input 
                    type="range" 
                    id="timelineSlider" 
                    min="${Math.max(1, Math.round((currentBaseline?.timeline || 0) * 0.5))}" 
                    max="${Math.round((currentBaseline?.timeline || 0) * 1.5)}" 
                    value="${currentBaseline?.timeline || 0}"
                    step="1"
                    style="width: 100%; height: 8px; border-radius: 5px; background: #ddd; outline: none;"
                    oninput="updateTimelineSlider(this.value)"
                >
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 5px;">
                    <span>${Math.max(1, Math.round((currentBaseline?.timeline || 0) * 0.5))} weeks</span>
                    <span>${Math.round((currentBaseline?.timeline || 0) * 1.5)} weeks</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 16px;">Team Configuration:</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="teamSize" value="1" checked onchange="updateTeamSize(this.value)">
                    <span>1 Developer (Baseline)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="teamSize" value="2" onchange="updateTeamSize(this.value)">
                    <span>2 Developers (Faster)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="teamSize" value="3" onchange="updateTeamSize(this.value)">
                    <span>3+ Developers (Fastest)</span>
                </label>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 16px;">Priority Mode:</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="priorityMode" value="mvp" onchange="updatePriorityMode(this.value)">
                    <span>MVP (Minimal Viable)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="priorityMode" value="balanced" checked onchange="updatePriorityMode(this.value)">
                    <span>Balanced</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #ddd;">
                    <input type="radio" name="priorityMode" value="complete" onchange="updatePriorityMode(this.value)">
                    <span>Complete (Full Scope)</span>
                </label>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="recalculateScenarios()" style="padding: 12px 32px; font-size: 16px;">
                🔄 Recalculate Scenarios
            </button>
            <button class="btn btn-secondary" onclick="resetRefinement()" style="padding: 12px 32px; font-size: 16px; margin-left: 10px;">
                ↺ Reset to Baseline
            </button>
        </div>
    `;
    
    scenariosSection.appendChild(panel);
}

function updateBudgetSlider(value) {
    const budgetValue = document.getElementById('budgetValue');
    if (budgetValue) {
        budgetValue.textContent = '₹' + formatIndianCurrency(parseInt(value));
    }
}

function updateTimelineSlider(value) {
    const timelineValue = document.getElementById('timelineValue');
    if (timelineValue) {
        timelineValue.textContent = value + ' weeks';
    }
}

function updateTeamSize(value) {
    // Store for recalculation
    window.currentTeamSize = value;
}

function updatePriorityMode(value) {
    // Store for recalculation
    window.currentPriorityMode = value;
}

function recalculateScenarios() {
    if (!currentScenarios) return;
    
    const budgetSlider = document.getElementById('budgetSlider');
    const timelineSlider = document.getElementById('timelineSlider');
    const teamSize = document.querySelector('input[name="teamSize"]:checked')?.value || '1';
    const priorityMode = document.querySelector('input[name="priorityMode"]:checked')?.value || 'balanced';
    
    const newConstraints = {
        maxBudget: budgetSlider ? parseInt(budgetSlider.value) : null,
        targetDeadline: timelineSlider ? timelineSlider.value + ' weeks' : null
    };
    
    const newUserPrefs = {
        priorityMode: priorityMode,
        teamSize: teamSize
    };
    
    // Show loading
    const scenariosSection = document.getElementById('scenariosSection');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'scenarioLoading';
    loadingDiv.style.cssText = 'text-align: center; padding: 40px; color: #666;';
    loadingDiv.innerHTML = '<div class="spinner" style="margin: 0 auto 20px;"></div><p>Recalculating scenarios...</p>';
    scenariosSection.insertBefore(loadingDiv, scenariosSection.firstChild);
    
    // Call API to recalculate
    fetch('/api/scenarios/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            baseline: currentBaseline,
            constraints: newConstraints,
            userPrefs: newUserPrefs
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.scenarios) {
            currentScenarios = data.scenarios;
            displayScenarios(data.scenarios);
            initializeRefinement(data.scenarios);
        } else {
            alert('Recalculation failed. Using client-side approximation.');
            // Fallback: approximate recalculation
            approximateRecalculation(newConstraints, newUserPrefs);
        }
    })
    .catch(error => {
        console.error('Recalculation error:', error);
        alert('Recalculation failed. Using client-side approximation.');
        approximateRecalculation(newConstraints, newUserPrefs);
    })
    .finally(() => {
        const loading = document.getElementById('scenarioLoading');
        if (loading) loading.remove();
    });
}

function approximateRecalculation(constraints, userPrefs) {
    // Client-side approximation (quick recalculation without API call)
    // This is a simplified version - full recalculation should use API
    
    if (!currentScenarios) return;
    
    // Update constraints in current scenarios
    const updatedScenarios = {
        ...currentScenarios,
        constraints: constraints,
        scenarios: currentScenarios.scenarios.map(scenario => {
            // Recalculate fit status
            const fitsBudget = !constraints.maxBudget || scenario.cost <= constraints.maxBudget;
            const fitsTimeline = !constraints.targetDeadline || 
                scenario.timeline <= parseDeadline(constraints.targetDeadline);
            
            return {
                ...scenario,
                fitsConstraints: fitsBudget && fitsTimeline,
                gap: {
                    budget: constraints.maxBudget ? scenario.cost - constraints.maxBudget : 0,
                    timeline: constraints.targetDeadline ? 
                        scenario.timeline - parseDeadline(constraints.targetDeadline) : 0
                }
            };
        })
    };
    
    // Re-rank scenarios
    updatedScenarios.scenarios.sort((a, b) => {
        const aScore = (a.fitsConstraints ? 100 : 0) + (a.score || 0);
        const bScore = (b.fitsConstraints ? 100 : 0) + (b.score || 0);
        return bScore - aScore;
    });
    
    currentScenarios = updatedScenarios;
    displayScenarios(updatedScenarios);
    initializeRefinement(updatedScenarios);
}

function resetRefinement() {
    if (!currentBaseline) return;
    
    const budgetSlider = document.getElementById('budgetSlider');
    const timelineSlider = document.getElementById('timelineSlider');
    
    if (budgetSlider) {
        budgetSlider.value = currentBaseline.cost || 0;
        updateBudgetSlider(budgetSlider.value);
    }
    
    if (timelineSlider) {
        timelineSlider.value = currentBaseline.timeline || 0;
        updateTimelineSlider(timelineSlider.value);
    }
    
    // Reset radio buttons
    document.querySelector('input[name="teamSize"][value="1"]').checked = true;
    document.querySelector('input[name="priorityMode"][value="balanced"]').checked = true;
    
    // Recalculate with baseline
    recalculateScenarios();
}

// Helper function (should be in scenario-display.js, but including here for now)
function formatIndianCurrency(amount) {
    if (!amount) return '0';
    if (amount >= 10000000) {
        return (amount / 10000000).toFixed(2) + 'Cr';
    } else if (amount >= 100000) {
        return (amount / 100000).toFixed(2) + 'L';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toLocaleString('en-IN');
}

function parseDeadline(deadline) {
    if (!deadline) return null;
    const str = deadline.toLowerCase();
    const match = str.match(/(\d+)/);
    if (!match) return null;
    const num = parseInt(match[1]);
    if (str.includes('week')) return num;
    if (str.includes('month')) return num * 4;
    if (str.includes('day')) return Math.ceil(num / 5);
    return num;
}

