/**
 * Assumption Panel Display
 * Shows all assumptions made during estimation
 */

function displayAssumptions(assumptions) {
    if (!assumptions || !assumptions.all || assumptions.all.length === 0) {
        return; // No assumptions to display
    }

    // Add assumption panel to results section
    let container = document.getElementById('assumptionsSection');
    if (!container) {
        container = document.createElement('div');
        container.id = 'assumptionsSection';
        container.className = 'result-card';
        container.style.display = 'block';
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.appendChild(container);
        } else {
            return; // Can't display without results section
        }
    }

    const grouped = assumptions.byCategory || {};
    const categories = Object.keys(grouped);

    let html = `
        <h2>📋 Assumptions Made</h2>
        <p style="color: #666; margin-bottom: 20px;">
            The following assumptions were used in calculating your estimate. 
            Click any assumption to see how changing it would affect cost and timeline.
        </p>
    `;

    categories.forEach(category => {
        const categoryAssumptions = grouped[category];
        // Defensive check: ensure categoryAssumptions is an array
        if (!Array.isArray(categoryAssumptions) || categoryAssumptions.length === 0) {
            return; // Skip this category if not an array or empty
        }
        
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ddd;">
                    ${categoryName} Assumptions
                </h3>
                <div style="display: grid; gap: 12px;">
        `;

        categoryAssumptions.forEach(assumption => {
            const impact = assumption.impact || {};
            const hasImpact = (impact.cost !== 0 || impact.timeline !== 0);

            html += `
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #4CAF50; cursor: pointer;"
                     onclick="showAssumptionDetails('${assumption.key}')"
                     onmouseover="this.style.background='#f0f0f0'"
                     onmouseout="this.style.background='#f9f9f9'">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                ${formatAssumptionKey(assumption.key)}
                            </div>
                            <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                                <strong>Current:</strong> ${formatAssumptionValue(assumption.value)}
                            </div>
                            ${impact.description ? `
                                <div style="color: #555; font-size: 13px; font-style: italic;">
                                    ${impact.description}
                                </div>
                            ` : ''}
                        </div>
                        ${hasImpact ? `
                            <div style="text-align: right; margin-left: 15px;">
                                ${impact.cost !== 0 ? `
                                    <div style="font-size: 12px; color: ${impact.cost > 0 ? '#f44336' : '#4CAF50'}; margin-bottom: 3px;">
                                        ${impact.cost > 0 ? '+' : ''}₹${formatIndianCurrency(Math.abs(impact.cost))}
                                    </div>
                                ` : ''}
                                ${impact.timeline !== 0 ? `
                                    <div style="font-size: 12px; color: ${impact.timeline > 0 ? '#f44336' : '#4CAF50'};">
                                        ${impact.timeline > 0 ? '+' : ''}${Math.abs(impact.timeline)} weeks
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #4CAF50;">
                        Click to change →
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px; color: #2e7d32;">
            <strong>💡 Note:</strong> Changing assumptions will recalculate scenarios. 
            Use the Interactive Refinement panel above to adjust constraints and see updated scenarios.
        </div>
    `;

    container.innerHTML = html;
}

function formatAssumptionKey(key) {
    // Convert camelCase to Title Case
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function formatAssumptionValue(value) {
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

function showAssumptionDetails(key) {
    // TODO: Show modal with assumption details and change options
    alert(`Assumption: ${key}\n\nDetailed view and change options coming soon!`);
}

// Helper function (should be shared)
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

