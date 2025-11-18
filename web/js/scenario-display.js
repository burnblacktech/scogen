/**
 * Scenario Display Module
 * Displays the Possibility Matrix with all viable scenarios
 * Ensures ALL modules are displayed regardless of budget constraints
 */

// Helper function for HTML escaping
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayScenarios(scenarios) {
    if (!scenarios || !scenarios.scenarios || scenarios.scenarios.length === 0) {
        return; // No scenarios to display
    }

    const container = document.getElementById('scenariosSection');
    container.style.display = 'block';

    // Handle both old format (scenarios.baseline) and new format (scenarios.baselineEstimate)
    const baseline = scenarios.baseline || scenarios.baselineEstimate || {};
    const scenarioList = Array.isArray(scenarios.scenarios) ? scenarios.scenarios : [];
    // Handle both old format (scenarios.recommendation as string) and new format (scenarios.recommendation as object)
    const recommendation = typeof scenarios.recommendation === 'string' 
      ? scenarios.recommendation 
      : (scenarios.recommendation?.primary || 'baseline');
    const constraints = scenarios.constraints || {};

    // Defensive check: ensure we have scenarios to display
    if (scenarioList.length === 0) {
        container.innerHTML = '<p style="color: #666;">No scenarios available to display.</p>';
        return;
    }

    const baselineCost = baseline?.cost?.total || baseline?.cost || 0;
    const baselineTimeline = baseline?.timeline?.withRisk || baseline?.timeline?.days || baseline?.timeline || 0;
    const baselineTimelineWeeks = typeof baselineTimeline === 'number' ? Math.round(baselineTimeline / 7) : 0;

    let html = `
        <h2>🎯 Delivery Options (All Viable Paths)</h2>
        <p style="color: #666; margin-bottom: 20px;">
            Your baseline scope requires <strong>₹${formatIndianCurrency(baselineCost)}</strong> and <strong>${baselineTimelineWeeks} weeks</strong>.
            ${constraints.maxBudget || constraints.targetDeadline ? 'Here are multiple ways to meet your constraints:' : 'Here are different approaches you can take:'}
        </p>
    `;

    // Constraint summary if provided
    if (constraints.maxBudget || constraints.targetDeadline) {
        html += `
            <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
                <h3 style="margin-bottom: 10px; font-size: 16px;">Your Constraints:</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    ${constraints.maxBudget ? `
                        <div>
                            <strong>Budget:</strong> ₹${formatIndianCurrency(constraints.maxBudget)}
                            ${baselineCost > constraints.maxBudget ? 
                                ` <span style="color: #f44336;">(Baseline exceeds by ₹${formatIndianCurrency(baselineCost - constraints.maxBudget)})</span>` : 
                                ` <span style="color: #4CAF50;">✓ Within budget</span>`}
                        </div>
                    ` : ''}
                    ${constraints.targetDeadline ? `
                        <div>
                            <strong>Deadline:</strong> ${constraints.targetDeadline}
                            ${baselineTimelineWeeks > parseDeadline(constraints.targetDeadline) ? 
                                ` <span style="color: #f44336;">(Baseline exceeds by ${Math.round(baselineTimelineWeeks - parseDeadline(constraints.targetDeadline))} weeks)</span>` : 
                                ` <span style="color: #4CAF50;">✓ Within timeline</span>`}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Display each scenario
    scenarioList.forEach((scenario, index) => {
        // Handle both old format (scenario.recommended) and new format (recommendation match)
        const isRecommended = scenario.recommended || scenario.type === recommendation;
        
        // Handle cost format: can be number or object with withContingency
        const scenarioCost = typeof scenario.cost === 'number' 
          ? scenario.cost 
          : (scenario.cost?.withContingency || scenario.cost?.total || 0);
        
        // Handle timeline format: can be number (weeks) or object with days
        const scenarioTimelineDays = typeof scenario.timeline === 'number'
          ? scenario.timeline * 7 // Assume weeks if number
          : (scenario.timeline?.days || scenario.timeline?.withRisk || 0);
        const scenarioTimelineWeeks = Math.round(scenarioTimelineDays / 7 * 10) / 10;
        
        // Handle constraint fit: can be boolean or object with budget/timeline
        const fitsConstraints = scenario.fitsConstraints !== undefined
          ? scenario.fitsConstraints
          : (scenario.constraintFit?.budget === 'fits' || scenario.constraintFit?.budget === 'perfect' || 
             scenario.constraintFit?.timeline === 'fits' || scenario.constraintFit?.timeline === 'perfect');
        
        const fitStatus = fitsConstraints ? '✅' : 
                         (scenario.constraintFit?.budget === 'close' || scenario.constraintFit?.timeline === 'close') ? '⚠️' : '🔴';
        const fitColor = fitsConstraints ? '#4CAF50' : '#ff9800';
        
        html += `
            <div style="border: 2px solid ${isRecommended ? '#4CAF50' : '#ddd'}; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: ${isRecommended ? '#f1f8f1' : '#fff'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0; color: #333; font-size: 20px;">
                            ${fitStatus} ${scenario.name}
                            ${isRecommended ? '<span style="color: #4CAF50; font-size: 14px;">⭐ RECOMMENDED</span>' : ''}
                        </h3>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Cost</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${fitsConstraints ? '#4CAF50' : '#f44336'};">
                            ₹${formatIndianCurrency(scenarioCost)}
                        </div>
                        ${scenario.gap?.budget ? `
                            <div style="font-size: 11px; color: #f44336; margin-top: 3px;">
                                ${scenario.gap.budget > 0 ? '+' : ''}₹${formatIndianCurrency(Math.abs(scenario.gap.budget))} ${scenario.gap.budget > 0 ? 'over' : 'under'} budget
                            </div>
                        ` : ''}
                    </div>
                    <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Timeline</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${fitsConstraints ? '#4CAF50' : '#f44336'};">
                            ${scenarioTimelineWeeks} weeks
                        </div>
                        ${scenario.gap?.timeline ? `
                            <div style="font-size: 11px; color: #f44336; margin-top: 3px;">
                                ${scenario.gap.timeline > 0 ? '+' : ''}${Math.abs(scenario.gap.timeline)} weeks ${scenario.gap.timeline > 0 ? 'over' : 'under'} deadline
                            </div>
                        ` : ''}
                    </div>
                    ${scenario.resources?.totalHeadcount ? `
                        <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Team</div>
                            <div style="font-size: 14px; font-weight: bold; color: #333;">
                                ${scenario.resources.totalHeadcount} members
                            </div>
                        </div>
                    ` : scenario.team ? `
                        <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Team</div>
                            <div style="font-size: 14px; font-weight: bold; color: #333;">
                                ${scenario.team}
                            </div>
                        </div>
                    ` : ''}
                    ${scenario.suitability ? `
                        <div style="padding: 12px; background: #f9f9f9; border-radius: 8px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Suitability</div>
                            <div style="font-size: 14px; font-weight: bold; color: #333;">
                                ${scenario.suitability}%
                            </div>
                        </div>
                    ` : ''}
                </div>

                ${scenario.modules ? `
                    <div style="margin-bottom: 15px;">
                        <strong>Scope:</strong> ${Array.isArray(scenario.modules) ? scenario.modules.length : scenario.moduleCount || 0} modules
                        ${scenario.deferred ? ` (${scenario.deferred.length} deferred to Phase 2)` : ''}
                        ${Array.isArray(scenario.modules) && scenario.modules.length > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background: #f0f7ff; border-radius: 4px; font-size: 13px;">
                                <strong>All Modules Included:</strong>
                                <ul style="margin: 5px 0 0 0; padding-left: 20px; columns: 2; column-gap: 20px;">
                                    ${scenario.modules.map(m => `<li>${typeof m === 'string' ? escapeHtml(m) : escapeHtml(m.name || m.id || 'Module')}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : scenario.scope ? `
                    <div style="margin-bottom: 15px;">
                        <strong>Scope:</strong> ${scenario.scope.modules?.length || 0} modules
                        ${scenario.deferred ? ` (${scenario.deferred.length} deferred to Phase 2)` : ''}
                        ${scenario.scope.modules && Array.isArray(scenario.scope.modules) && scenario.scope.modules.length > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background: #f0f7ff; border-radius: 4px; font-size: 13px;">
                                <strong>All Modules Included:</strong>
                                <ul style="margin: 5px 0 0 0; padding-left: 20px; columns: 2; column-gap: 20px;">
                                    ${scenario.scope.modules.map(m => `<li>${typeof m === 'string' ? escapeHtml(m) : escapeHtml(m.name || m.id || 'Module')}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : scenario.moduleCount ? `
                    <div style="margin-bottom: 15px;">
                        <strong>Scope:</strong> ${scenario.moduleCount} modules (all modules preserved)
                    </div>
                ` : ''}

                ${scenario.phases && Array.isArray(scenario.phases) ? `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                        <strong>Phased Delivery:</strong>
                        <div style="margin-top: 10px;">
                            ${scenario.phases.map((phase, idx) => `
                                <div style="margin-bottom: 8px;">
                                    <strong>${phase.name || `Phase ${idx + 1}`}:</strong> ₹${formatIndianCurrency(phase.cost || 0)}, ${phase.timeline || 0} days
                                </div>
                            `).join('')}
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                            <strong>Total:</strong> ₹${formatIndianCurrency(scenarioCost)}, ${scenarioTimelineWeeks} weeks
                        </div>
                    </div>
                ` : scenario.phases && typeof scenario.phases === 'object' ? `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                        <strong>Phased Delivery:</strong>
                        <div style="margin-top: 10px;">
                            ${Object.entries(scenario.phases).map(([key, phase]) => `
                                <div style="margin-bottom: 8px;">
                                    <strong>${phase.name || key}:</strong> ₹${formatIndianCurrency(phase.cost || 0)}, ${phase.timeline || 0} weeks ${phase.start ? `(${phase.start})` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                            <strong>Total:</strong> ₹${formatIndianCurrency(scenario.totalCost || scenarioCost)}, ${scenario.totalTimeline || scenarioTimelineWeeks} weeks
                        </div>
                    </div>
                ` : ''}

                ${scenario.optimizations ? `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                        <strong>Technical Optimizations:</strong>
                        <ul style="margin: 10px 0 0 20px;">
                            ${scenario.optimizations.map(opt => `
                                <li style="margin-bottom: 5px;">
                                    <strong>${opt.name}:</strong> Save ₹${formatIndianCurrency(opt.savings)}
                                    <div style="font-size: 12px; color: #666; margin-left: 20px;">${opt.impact}</div>
                                </li>
                            `).join('')}
                        </ul>
                        ${scenario.ongoingCosts ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; color: #ff9800;">
                                <strong>Ongoing Costs:</strong> ₹${formatIndianCurrency(scenario.ongoingCosts.firebase)}/year (Firebase)
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${scenario.tradeoffs && scenario.tradeoffs.pros && scenario.tradeoffs.cons ? `
                <div style="margin-top: 15px; padding: 15px; background: #fff4e6; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <strong>Trade-offs:</strong>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                        <div>
                            <div style="color: #4CAF50; font-weight: 600; margin-bottom: 5px;">✓ Pros:</div>
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                                ${Array.isArray(scenario.tradeoffs.pros) ? scenario.tradeoffs.pros.map(pro => `<li>${pro}</li>`).join('') : '<li>No pros listed</li>'}
                            </ul>
                        </div>
                        <div>
                            <div style="color: #f44336; font-weight: 600; margin-bottom: 5px;">✗ Cons:</div>
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                                ${Array.isArray(scenario.tradeoffs.cons) ? scenario.tradeoffs.cons.map(con => `<li>${con}</li>`).join('') : '<li>No cons listed</li>'}
                            </ul>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${scenario.recommendation ? `
                    <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 8px; color: #2e7d32;">
                        <strong>💡 Recommendation:</strong> ${scenario.recommendation}
                    </div>
                ` : ''}

                <div style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="selectScenario(${index})" style="margin-right: 10px;">
                        Select This Option
                    </button>
                    <button class="btn btn-secondary" onclick="viewScenarioDetails(${index})">
                        View Details
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    
    // Initialize refinement panel after displaying scenarios
    if (typeof initializeRefinement === 'function') {
        initializeRefinement(scenarios);
    }
}

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

function selectScenario(index) {
    // TODO: Implement scenario selection logic
    // This would trigger a detailed breakdown of the selected scenario
    alert(`Scenario ${index + 1} selected. Detailed breakdown coming soon!`);
}

function viewScenarioDetails(index) {
    // TODO: Implement detailed view
    alert(`Viewing details for scenario ${index + 1}`);
}

