/**
 * Review Scope Handler (Modern Tailwind UI)
 * 
 * Handles scope review, feature editing, and selective document generation
 * with modern UI features: drag-and-drop, search, filters, keyboard shortcuts
 */

const API_BASE = '/api/v3/unified';

// Get scopeId from URL
const urlParams = new URLSearchParams(window.location.search);
const scopeId = urlParams.get('scopeId');

let currentScope = null;
let currentFeatures = [];
let originalFeatures = []; // Store original for comparison
let progressTracker = null;
let completedDocuments = {};
let sortableInstances = {}; // Store SortableJS instances
let changeHistory = []; // For undo functionality
let selectedFeatureIndex = -1; // For keyboard navigation

/**
 * Initialize page
 */
async function init() {
    if (!scopeId) {
        showError('No scope ID provided. Please start from the input page.');
        return;
    }

    // Hide loading skeleton
    const skeleton = document.getElementById('loadingSkeleton');
    if (skeleton) skeleton.style.display = 'none';

    // Initialize progress tracker
    if (typeof ProgressTracker !== 'undefined') {
        progressTracker = new ProgressTracker(
            (data) => updateProgress(data),
            (data) => handleCompletion(data),
            (error) => handleGenerationError(error),
            (data) => handleCompletion(data) // Partial success handler
        );
        try {
            progressTracker.connect();
        } catch (error) {
            console.warn('Failed to connect to Socket.IO, progress updates disabled', error);
        }
    }

    // Setup event listeners
    setupSearchAndFilter();
    setupKeyboardShortcuts();
    setupLevelCheckboxes();

    await loadScope();
    
    // Load suggestions after scope loads
    await loadSuggestions();
}

/**
 * Setup search and filter functionality
 */
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const complexityFilter = document.getElementById('complexityFilter');
    const showOnlySelected = document.getElementById('showOnlySelected');
    const selectAllEssential = document.getElementById('selectAllEssential');

    if (searchInput) {
        searchInput.addEventListener('input', () => renderFeatures());
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => renderFeatures());
    }

    if (complexityFilter) {
        complexityFilter.addEventListener('change', () => renderFeatures());
    }

    if (showOnlySelected) {
        showOnlySelected.addEventListener('change', () => renderFeatures());
    }

    if (selectAllEssential) {
        selectAllEssential.addEventListener('click', () => {
            currentFeatures.forEach(f => {
                if (f.category === 'Core' || f.category === 'Essential') {
                    f.included = true;
                }
            });
            renderFeatures();
            updateScope();
            if (typeof toast !== 'undefined') {
                toast.success('All essential features selected');
            }
        });
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Space: Toggle selected feature
        if (e.code === 'Space' && selectedFeatureIndex >= 0) {
            e.preventDefault();
            toggleFeature(selectedFeatureIndex);
        }

        // Enter: Generate documents
        if (e.code === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            generateSelected();
        }

        // Ctrl+S: Save changes
        if (e.code === 'KeyS' && e.ctrlKey) {
            e.preventDefault();
            updateScope();
            if (typeof toast !== 'undefined') {
                toast.success('Changes saved');
            }
        }

        // Ctrl+Z: Undo last change
        if (e.code === 'KeyZ' && e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            undoLastChange();
        }

        // ?: Show keyboard shortcuts
        if (e.code === 'Slash' && e.shiftKey) {
            e.preventDefault();
            showKeyboardShortcuts();
        }
    });
}

/**
 * Setup level checkbox styling
 */
function setupLevelCheckboxes() {
    document.querySelectorAll('.level-checkbox').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (!checkbox) return;

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                label.classList.add('border-primary', 'bg-primary', 'bg-opacity-10');
                label.querySelector('span').classList.add('text-primary', 'font-bold');
            } else {
                label.classList.remove('border-primary', 'bg-primary', 'bg-opacity-10');
                label.querySelector('span').classList.remove('text-primary', 'font-bold');
            }
        });
    });
}

/**
 * Load feature suggestions
 */
async function loadSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/suggestions/${scopeId}`);
        
        if (!response.ok) {
            // Non-critical: suggestions are optional
            return;
        }

        const data = await response.json();
        if (data.success && data.suggestions) {
            renderSuggestions(data.suggestions);
        }
    } catch (err) {
        console.warn('Failed to load suggestions:', err);
        // Non-critical: continue without suggestions
    }
}

/**
 * Render suggestions in UI
 */
function renderSuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestions-list');
    if (!suggestionsList) return;

    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="text-sm text-gray-400 text-center py-4">No suggestions at this time</div>';
        return;
    }

    suggestionsList.innerHTML = suggestions.map((suggestion, index) => {
        const feature = suggestion.feature;
        const confidencePercent = Math.round(suggestion.confidence * 100);
        
        return `
            <div class="suggestion-card bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition" 
                 onclick="addSuggestedFeature('${escapeHtml(feature.name)}', ${index})">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="font-semibold text-sm text-gray-800 mb-1">${escapeHtml(feature.name)}</div>
                        <div class="text-xs text-gray-600 mb-2">${escapeHtml(suggestion.reason || 'Recommended feature')}</div>
                        <div class="flex items-center gap-2 text-xs text-gray-500">
                            <span>${feature.hours || 0} hours</span>
                            <span>•</span>
                            <span>${getComplexityLabel(feature.complexity || 2)}</span>
                            <span>•</span>
                            <span class="text-blue-600">${confidencePercent}% confidence</span>
                        </div>
                    </div>
                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2" 
                            onclick="event.stopPropagation(); addSuggestedFeature('${escapeHtml(feature.name)}', ${index})">
                        + Add
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Add suggested feature to scope
 */
async function addSuggestedFeature(featureName, suggestionIndex) {
    // Find the feature in current features or create new one
    let feature = currentFeatures.find(f => f.name === featureName);
    
    if (!feature) {
        // Create new feature from suggestion
        const suggestionsResponse = await fetch(`${API_BASE}/suggestions/${scopeId}`);
        if (suggestionsResponse.ok) {
            const data = await suggestionsResponse.json();
            if (data.suggestions && data.suggestions[suggestionIndex]) {
                feature = data.suggestions[suggestionIndex].feature;
            }
        }
        
        if (!feature) {
            // Fallback: create basic feature
            feature = {
                name: featureName,
                category: 'Recommended',
                included: true,
                hours: 25,
                complexity: 2,
                description: 'Suggested feature',
                dependencies: []
            };
        }
        
        currentFeatures.push(feature);
    } else {
        // Feature exists, just enable it
        feature.included = true;
    }

    // Re-render and update
    renderFeatures();
    await updateScope();
    
    // Reload suggestions
    await loadSuggestions();
    
    if (typeof toast !== 'undefined') {
        toast.success(`Added "${featureName}" to scope`);
    }
}

/**
 * Load scope data
 */
async function loadScope() {
    try {
        const response = await fetch(`${API_BASE}/scope/${scopeId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        currentScope = data;
        currentFeatures = data.features || [];
        originalFeatures = JSON.parse(JSON.stringify(currentFeatures)); // Deep copy

        // Debug: Log cost data
        console.log('Scope loaded:', {
            estimatedCost: data.estimatedCost,
            cost: data.cost,
            totalCost: data.cost?.totalCost,
            features: data.features?.length
        });

        // Populate category filter
        populateCategoryFilter();

        renderFeatures();
        updateSummary();
        
        // Load suggestions after scope loads
        await loadSuggestions();

    } catch (err) {
        console.error('Failed to load scope:', err);
        showError(`Failed to load scope: ${err.message}`);
    }
}

/**
 * Populate category filter dropdown
 */
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const categories = [...new Set(currentFeatures.map(f => f.category || 'Uncategorized'))];
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

/**
 * Render features grouped by category with collapsible sections
 */
function renderFeatures() {
    const categoriesContainer = document.getElementById('feature-categories');
    if (!categoriesContainer) return;

    categoriesContainer.innerHTML = '';

    // Get filter values
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const complexityFilter = document.getElementById('complexityFilter')?.value || '';
    const showOnlySelected = document.getElementById('showOnlySelected')?.checked || false;

    // Filter features
    let filteredFeatures = currentFeatures.filter(f => {
        // Search filter
        if (searchTerm && !f.name.toLowerCase().includes(searchTerm) && 
            !(f.description || '').toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Category filter
        if (categoryFilter && f.category !== categoryFilter) {
            return false;
        }

        // Complexity filter
        if (complexityFilter && String(f.complexity || 0) !== complexityFilter) {
            return false;
        }

        // Show only selected
        if (showOnlySelected && !f.included) {
            return false;
        }

        return true;
    });

    // Group by category
    const categories = {};
    filteredFeatures.forEach(f => {
        const category = f.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(f);
    });

    // Render each category
    Object.keys(categories).sort().forEach(category => {
        const categoryFeatures = categories[category];
        const selectedCount = categoryFeatures.filter(f => f.included).length;
        const totalHours = categoryFeatures.filter(f => f.included)
            .reduce((sum, f) => sum + (f.hours || 0), 0);
        const totalCost = categoryFeatures.filter(f => f.included)
            .reduce((sum, f) => sum + ((f.hours || 0) * 2000 * ((f.complexity || 2) / 2)), 0);

        // Map features to their actual indices in currentFeatures
        const featuresWithIndices = categoryFeatures.map(feature => {
            const actualIndex = currentFeatures.findIndex(f => f === feature);
            return { feature, actualIndex };
        });

        const categorySection = createCategorySection(
            category,
            featuresWithIndices,
            selectedCount,
            totalHours,
            totalCost
        );
        categoriesContainer.appendChild(categorySection);
    });

    // Initialize drag-and-drop for each category
    initializeSortable();
}

/**
 * Create category section with collapsible header
 */
function createCategorySection(category, featuresWithIndices, selectedCount, totalHours, totalCost) {
    const section = document.createElement('div');
    section.className = 'category-section mb-6';
    section.dataset.category = category;

    const categoryId = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;
    const contentId = `${categoryId}-content`;

    section.innerHTML = `
        <button class="category-header w-full bg-gray-100 hover:bg-gray-200 rounded-lg p-4 flex items-center justify-between transition-colors" 
                onclick="toggleCategory('${categoryId}')">
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5 transition-transform category-chevron" id="${categoryId}-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                <h2 class="text-xl font-bold text-gray-800">${escapeHtml(category)}</h2>
                <span class="px-3 py-1 bg-primary text-white text-sm rounded-full">${selectedCount} of ${featuresWithIndices.length} selected</span>
            </div>
            <div class="text-sm text-gray-600">
                <span class="font-semibold">${totalHours} hours</span> • 
                <span class="font-semibold">${formatCurrency(totalCost)}</span>
            </div>
        </button>
        <div class="category-content mt-4 space-y-3" id="${contentId}">
            ${featuresWithIndices.map(({ feature, actualIndex }) => createFeatureCard(feature, actualIndex)).join('')}
        </div>
    `;

    return section;
}

/**
 * Create feature card component
 */
function createFeatureCard(feature, index) {
    const featureId = `feature-${index}`;
    const complexity = feature.complexity || 2;
    const stars = Array(5).fill(0).map((_, i) => 
        i < complexity 
            ? '<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>'
            : '<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>'
    ).join('');

    const categoryBadge = feature.category === 'Core' || feature.category === 'Essential' 
        ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Essential</span>'
        : '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">' + escapeHtml(feature.category || 'Other') + '</span>';

    return `
        <div class="feature-card bg-white rounded-lg shadow-md p-4 border-2 border-transparent hover:border-primary transition-all duration-200 cursor-move" 
             data-feature-index="${index}"
             data-feature-id="${featureId}"
             onclick="selectFeature(${index})"
             onkeydown="if(event.key==='Enter') toggleFeature(${index})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="drag-handle text-gray-400 hover:text-gray-600 cursor-move mr-2">☰</span>
                        <h3 class="text-lg font-semibold text-gray-800">${escapeHtml(feature.name)}</h3>
                        ${categoryBadge}
                    </div>
                    
                    ${feature.description ? `<p class="text-sm text-gray-600 mb-3">${escapeHtml(feature.description)}</p>` : ''}
                    
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                        <div class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${feature.hours || 0} hours</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <div class="flex">${stars}</div>
                            <span>${getComplexityLabel(complexity)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Toggle Switch -->
                <label class="relative inline-flex items-center cursor-pointer ml-4" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           id="${featureId}" 
                           ${feature.included ? 'checked' : ''}
                           onchange="toggleFeature(${index})"
                           class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>
    `;
}

/**
 * Get complexity label
 */
function getComplexityLabel(complexity) {
    const labels = {
        1: 'Very Low',
        2: 'Low',
        3: 'Medium',
        4: 'High',
        5: 'Very High'
    };
    return labels[complexity] || 'Medium';
}

/**
 * Toggle category expand/collapse
 */
function toggleCategory(categoryId) {
    const content = document.getElementById(`${categoryId}-content`);
    const chevron = document.getElementById(`${categoryId}-chevron`);
    
    if (content && chevron) {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

/**
 * Initialize SortableJS for drag-and-drop
 */
function initializeSortable() {
    // Destroy existing instances
    Object.values(sortableInstances).forEach(instance => {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    });
    sortableInstances = {};

    // Create new instances for each category
    document.querySelectorAll('.category-content').forEach(content => {
        const category = content.closest('.category-section')?.dataset.category;
        if (!category) return;

        const sortable = new Sortable(content, {
            animation: 150,
            handle: '.drag-handle',
            onEnd: function(evt) {
                updateFeaturePriority(category, evt.oldIndex, evt.newIndex);
            }
        });

        sortableInstances[category] = sortable;
    });
}

/**
 * Update feature priority after drag-and-drop
 */
function updateFeaturePriority(category, oldIndex, newIndex) {
    const categoryFeatures = currentFeatures.filter(f => f.category === category);
    if (oldIndex === newIndex || oldIndex >= categoryFeatures.length || newIndex >= categoryFeatures.length) {
        return;
    }

    // Reorder features in the category
    const feature = categoryFeatures[oldIndex];
    categoryFeatures.splice(oldIndex, 1);
    categoryFeatures.splice(newIndex, 0, feature);

    // Update main features array
    let categoryStartIndex = 0;
    currentFeatures.forEach((f, idx) => {
        if (f.category === category) {
            if (idx === categoryStartIndex + oldIndex) {
                // Find the feature in main array and update its position
                const mainIndex = currentFeatures.findIndex(mf => mf.name === feature.name && mf.category === category);
                if (mainIndex !== -1) {
                    const [moved] = currentFeatures.splice(mainIndex, 1);
                    const newMainIndex = currentFeatures.findIndex(mf => mf.category === category && 
                        currentFeatures.indexOf(mf) >= categoryStartIndex + newIndex);
                    if (newMainIndex !== -1) {
                        currentFeatures.splice(newMainIndex, 0, moved);
                    } else {
                        currentFeatures.push(moved);
                    }
                }
            }
            categoryStartIndex++;
        }
    });

    // Save priority (could send to API)
    if (typeof toast !== 'undefined') {
        toast.info('Feature priority updated');
    }
}

/**
 * Select feature for keyboard navigation
 */
function selectFeature(index) {
    // Remove previous selection
    document.querySelectorAll('.feature-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary');
    });

    // Add selection to current
    const card = document.querySelector(`[data-feature-index="${index}"]`);
    if (card) {
        card.classList.add('ring-2', 'ring-primary');
        selectedFeatureIndex = index;
    }
}

/**
 * Toggle feature inclusion
 */
async function toggleFeature(index) {
    if (index < 0 || index >= currentFeatures.length) return;

    // Save to history for undo
    changeHistory.push({
        type: 'toggle',
        index: index,
        previousValue: currentFeatures[index].included
    });

    currentFeatures[index].included = !currentFeatures[index].included;

    // Update UI immediately
    renderFeatures();
    
    // Update summary (cost, timeline)
    updateSummary();
    
    // Update change count
    updateChangeCount();
    
    // Update scope on server
    await updateScope();

    // Animate cost update
    animateCostUpdate();
    
    // Reload suggestions when features change
    await loadSuggestions();
}

/**
 * Undo last change
 */
function undoLastChange() {
    if (changeHistory.length === 0) {
        if (typeof toast !== 'undefined') {
            toast.warning('No changes to undo');
        }
        return;
    }

    const lastChange = changeHistory.pop();
    if (lastChange.type === 'toggle' && lastChange.index < currentFeatures.length) {
        currentFeatures[lastChange.index].included = lastChange.previousValue;
        renderFeatures();
        updateScope();
        if (typeof toast !== 'undefined') {
            toast.info('Change undone');
        }
    }
}

/**
 * Update scope on server
 */
async function updateScope() {
    try {
        const changes = {
            features: currentFeatures.map(f => ({
                name: f.name,
                included: f.included
            }))
        };

        const response = await fetch(`${API_BASE}/update-scope`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scopeId: scopeId,
                changes: changes
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        // Update current scope with new costs
        if (result.newCost !== undefined) {
            currentScope.estimatedCost = result.newCost;
        }
        if (result.newTimeline !== undefined) {
            currentScope.estimatedTimeline = result.newTimeline;
        }

        updateSummary();

    } catch (err) {
        console.error('Failed to update scope:', err);
        showError(`Failed to update scope: ${err.message}`);
    }
}

/**
 * Update summary display with animations
 */
function updateSummary() {
    const includedFeatures = currentFeatures.filter(f => f.included !== false);
    const totalHours = includedFeatures.reduce((sum, f) => {
        const hours = parseFloat(f.hours) || 0;
        return sum + (isNaN(hours) ? 0 : hours);
    }, 0);
    
    // ALWAYS calculate cost from included features (user may have toggled features)
    // This ensures the cost reflects the current selection
    let totalCost = 0;
    
    if (includedFeatures.length > 0) {
        // Calculate from individual features
        totalCost = calculateEstimatedCost(includedFeatures);
    }
    
    // If calculation failed or no features, use stored cost as fallback
    if (!totalCost || isNaN(totalCost) || totalCost <= 0) {
        // Try stored cost as fallback
        if (currentScope?.cost?.totalCost && 
            typeof currentScope.cost.totalCost === 'number' && 
            !isNaN(currentScope.cost.totalCost) && 
            currentScope.cost.totalCost > 0) {
            totalCost = currentScope.cost.totalCost;
        }
        // Try estimatedCost from API response
        else if (currentScope?.estimatedCost && 
                 typeof currentScope.estimatedCost === 'number' && 
                 !isNaN(currentScope.estimatedCost) && 
                 currentScope.estimatedCost > 0) {
            totalCost = currentScope.estimatedCost;
        }
        // Final fallback
        else {
            totalCost = 50000; // Minimum cost
        }
    }
    
    // Ensure totalCost is valid
    if (!totalCost || isNaN(totalCost) || totalCost < 0) {
        totalCost = 50000;
    }
    
    const timeline = currentScope?.estimatedTimeline || calculateTimeline(totalHours);

    // Debug: Log cost calculation (only once per scope load, not on every update)
    if (window._lastLoggedScopeId !== currentScope?.scopeId) {
        console.log('updateSummary:', {
            scopeId: currentScope?.scopeId,
            storedCost: currentScope?.cost?.totalCost,
            estimatedCost: currentScope?.estimatedCost,
            calculatedCost: calculateEstimatedCost(includedFeatures),
            finalCost: totalCost,
            includedFeaturesCount: includedFeatures.length
        });
        window._lastLoggedScopeId = currentScope?.scopeId;
    }

    // Update total cost with animation
    const totalCostEl = document.getElementById('total-cost');
    if (totalCostEl) {
        totalCostEl.classList.add('animate-pulse-cost');
        totalCostEl.textContent = formatCurrency(totalCost);
        setTimeout(() => {
            totalCostEl.classList.remove('animate-pulse-cost');
        }, 500);
    }

    // Update timeline
    const timelineValue = document.getElementById('timeline-value');
    const timelineBar = document.getElementById('timeline-bar');
    if (timelineValue) {
        const weeks = Math.ceil(timeline / 7);
        timelineValue.textContent = `${weeks} weeks`;
    }
    if (timelineBar) {
        const maxWeeks = 24; // Assume max 24 weeks
        const weeks = Math.ceil(timeline / 7);
        const percentage = Math.min((weeks / maxWeeks) * 100, 100);
        timelineBar.style.width = `${percentage}%`;
    }

    // Update team composition (simplified)
    const teamComp = document.getElementById('team-composition');
    if (teamComp) {
        const backendDevs = Math.ceil(totalHours / 800); // Rough estimate
        const frontendDevs = Math.ceil(totalHours / 1000);
        const qaEngineers = Math.ceil(totalHours / 1200);
        
        teamComp.innerHTML = `
            <div class="flex justify-between text-sm">
                <span>Backend Developers</span>
                <span class="font-semibold">${backendDevs}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>Frontend Developers</span>
                <span class="font-semibold">${frontendDevs}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>QA Engineers</span>
                <span class="font-semibold">${qaEngineers}</span>
            </div>
        `;
    }

    // Update cost breakdown
    const costBreakdown = document.getElementById('cost-breakdown');
    if (costBreakdown) {
        const development = Math.round(totalCost * 0.7);
        const testing = Math.round(totalCost * 0.15);
        const projectMgmt = Math.round(totalCost * 0.1);
        const gst = Math.round(totalCost * 0.18);

        costBreakdown.innerHTML = `
            <div class="flex justify-between text-sm">
                <span>Development</span>
                <span class="font-semibold">${formatCurrency(development)}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>Testing</span>
                <span class="font-semibold">${formatCurrency(testing)}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>Project Management</span>
                <span class="font-semibold">${formatCurrency(projectMgmt)}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-500 pt-2 border-t">
                <span>GST (18%)</span>
                <span>${formatCurrency(gst)}</span>
            </div>
        `;
    }

    // Update change count badge
    const changeCount = calculateChangeCount();
    const changeCountEl = document.getElementById('changeCount');
    const viewComparisonBtn = document.getElementById('viewComparisonBtn');
    if (changeCount > 0) {
        if (changeCountEl) changeCountEl.textContent = changeCount;
        if (viewComparisonBtn) viewComparisonBtn.classList.remove('hidden');
    } else {
        if (viewComparisonBtn) viewComparisonBtn.classList.add('hidden');
    }
}

/**
 * Calculate change count
 */
function calculateChangeCount() {
    if (originalFeatures.length !== currentFeatures.length) {
        return Math.abs(originalFeatures.length - currentFeatures.length);
    }
    
    let changes = 0;
    currentFeatures.forEach((f, idx) => {
        const original = originalFeatures.find(of => of.name === f.name);
        if (original && original.included !== f.included) {
            changes++;
        }
    });
    
    return changes;
}

/**
 * Animate cost update
 */
function animateCostUpdate() {
    const totalCostEl = document.getElementById('total-cost');
    if (totalCostEl) {
        totalCostEl.classList.add('animate-pulse-cost');
        setTimeout(() => {
            totalCostEl.classList.remove('animate-pulse-cost');
        }, 500);
    }
}

/**
 * Calculate estimated cost
 */
function calculateEstimatedCost(features) {
    // Handle invalid input
    if (!Array.isArray(features) || features.length === 0) {
        return 50000; // Minimum fallback
    }
    
    let total = 0;
    features.forEach(f => {
        if (!f || typeof f !== 'object') return;
        
        // Ensure hours is a valid number
        const hours = parseFloat(f.hours) || parseFloat(f.estimatedHours) || 25;
        if (isNaN(hours) || hours < 0) return;
        
        // Ensure complexity is a valid number
        const complexity = parseFloat(f.complexity) || 2;
        if (isNaN(complexity) || complexity < 0) return;
        
        // Calculate cost for this feature
        const featureCost = hours * 2000 * (complexity / 2);
        if (!isNaN(featureCost) && featureCost > 0) {
            total += featureCost;
        }
    });
    
    // Add 20% overhead and ensure result is valid
    const finalCost = Math.round(total * 1.2);
    return (finalCost > 0 && !isNaN(finalCost)) ? finalCost : 50000; // Minimum fallback
}

/**
 * Calculate timeline
 */
function calculateTimeline(totalHours) {
    const days = Math.ceil(totalHours / 8);
    return Math.ceil(days * 1.2); // Add 20% buffer
}

/**
 * Generate selected documents
 */
async function generateSelected() {
    const generateBtn = document.getElementById('generateBtn');
    const progressSection = document.getElementById('progressSection');
    const content = document.getElementById('content');

    // Get selected documents
    const selections = [];
    document.querySelectorAll('.level-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
        const type = checkbox.getAttribute('data-type');
        const level = checkbox.getAttribute('data-level');
        selections.push({ type, level });
    });

    if (selections.length === 0) {
        showError('Please select at least one document to generate');
        if (typeof toast !== 'undefined') {
            toast.warning('Please select at least one document to generate');
        }
        return;
    }

    const includeAMC = document.getElementById('includeAMC')?.checked || false;
    
    // Get selected export formats
    const selectedFormats = [];
    document.querySelectorAll('.export-format:checked').forEach(checkbox => {
      selectedFormats.push(checkbox.value);
    });
    
    if (selectedFormats.length === 0) {
      showError('Please select at least one export format');
      if (typeof toast !== 'undefined') {
        toast.warning('Please select at least one export format');
      }
      return;
    }

    // Reset completed documents
    completedDocuments = {};

    // Show progress section, hide content
    if (generateBtn) generateBtn.disabled = true;
    if (progressSection) {
        progressSection.classList.remove('hidden');
        progressSection.style.display = 'block';
    }
    if (content) content.style.display = 'none';
    
    // Reset progress
    updateProgress({ completed: 0, total: selections.length, current: 'Starting...', percentage: 0 });

    try {
        const response = await fetch(`${API_BASE}/generate-selected`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scopeId: scopeId,
                selections: selections,
                includeAMC: includeAMC,
                formats: selectedFormats
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Check if jobId is returned (queue-based) or documents (synchronous)
        if (result.jobId) {
            // Queue-based: Subscribe to job updates
            if (progressTracker && progressTracker.connected) {
                progressTracker.subscribe(result.jobId);
            } else {
                // Fallback: Poll job status
                pollJobStatus(result.jobId);
            }
        } else if (result.documents) {
            // Synchronous: Show success immediately
            handleCompletion({ documents: result.documents });
        } else {
            throw new Error('Invalid response from server');
        }

    } catch (err) {
        console.error('Generation error:', err);
        if (progressSection) progressSection.style.display = 'none';
        if (content) content.style.display = 'block';
        if (generateBtn) generateBtn.disabled = false;
        showError(`Failed to generate documents: ${err.message}`);
        if (typeof toast !== 'undefined') {
            toast.error(`Failed to generate documents: ${err.message}`);
        }
    }
}

/**
 * Update progress display
 */
function updateProgress(data) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar) {
        progressBar.style.width = `${data.percentage || 0}%`;
    }

    if (progressText) {
        const currentDoc = data.current || 'Preparing...';
        const docName = formatDocumentName(currentDoc);
        progressText.textContent = `Generating ${docName}... (${data.completed || 0}/${data.total || 0})`;
    }

    // Show completed document if available
    if (data.document && data.document.fileName && !completedDocuments[data.current]) {
        completedDocuments[data.current] = data.document;
        addCompletedDocument(data.current, data.document);
    }
}

/**
 * Format document name for display
 */
function formatDocumentName(docKey) {
    const parts = docKey.split('_');
    if (parts.length === 2) {
        const type = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const level = parts[1];
        
        const typeNames = {
            'Cost': 'Cost Proposal',
            'Business': 'Business Document',
            'Technical': 'Technical Blueprint'
        };
        
        return `${typeNames[type] || type} ${level}`;
    }
    return docKey;
}

/**
 * Add completed document to UI (supports multiple formats)
 */
function addCompletedDocument(docKey, doc) {
    // Handle multiple formats - docKey might include format suffix
    const baseKey = docKey.split('_(')[0]; // Remove format suffix if present
    const format = doc.format || 'pdf';
    
    // Create unique key for this format
    const formatKey = `${baseKey}_${format}`;
    
    // Check if already added
    if (completedDocuments[formatKey]) {
        return;
    }
    
    completedDocuments[formatKey] = doc;
    const completedDocsDiv = document.getElementById('completedDocuments');
    if (!completedDocsDiv) return;

    const downloadUrl = doc.secureUrl || doc.url || `/downloads/${doc.fileName}`;
    const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
    const isFailed = doc.status === 'failed';
    const isHtmlFallback = doc.format === 'html';
    const formatLabel = format === 'xlsx' ? 'Excel' : format === 'docx' ? 'Word' : format === 'html' ? 'HTML' : 'PDF';
    
    const docCard = document.createElement('div');
    docCard.className = `bg-white rounded-lg shadow-md p-4 border-2 ${
        isFailed ? 'border-red-500' : isHtmlFallback ? 'border-yellow-500' : 'border-green-500'
    }`;

    let statusIcon = isFailed ? '✗' : isHtmlFallback ? '⚠' : '✓';
    let statusColor = isFailed ? 'text-red-500' : isHtmlFallback ? 'text-yellow-500' : 'text-green-500';
    let downloadText = `Download ${formatLabel}`;

    let expiryText = '';
    if (expiresAt) {
        const now = new Date();
        const timeRemaining = expiresAt - now;
        const minutesRemaining = Math.floor(timeRemaining / 60000);
        
        if (minutesRemaining > 0) {
            expiryText = `<div class="text-xs text-gray-500 mt-2">Expires in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}</div>`;
        } else {
            expiryText = `<div class="text-xs text-red-500 mt-2">Link expired</div>`;
        }
    }

    docCard.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <span class="${statusColor} text-xl">${statusIcon}</span>
                <span class="font-semibold text-gray-800">${formatDocumentName(baseKey)} (${formatLabel})</span>
            </div>
        </div>
        ${doc.error ? `<div class="text-sm text-red-600 mb-2">${escapeHtml(doc.error)}</div>` : ''}
        <a href="${downloadUrl}" 
           class="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
           download="${doc.fileName}">
            ${downloadText}
        </a>
        ${expiryText}
    `;

    completedDocsDiv.appendChild(docCard);
}

/**
 * Handle completion (including partial success)
 */
function handleCompletion(data) {
    const progressSection = document.getElementById('progressSection');
    const generateBtn = document.getElementById('generateBtn');
    const progressText = document.getElementById('progressText');
    const completedDocsDiv = document.getElementById('completedDocuments');

    const jobStatus = data.status || 'completed';
    const successfulDocs = data.documents?.successful || [];
    const failedDocs = data.documents?.failed || [];
    const totalDocs = successfulDocs.length + failedDocs.length;

    // Update progress to 100%
    updateProgress({ completed: totalDocs, total: totalDocs, percentage: 100 });

    // Update text based on status
    if (progressText) {
        if (jobStatus === 'completed') {
            progressText.textContent = 'All documents generated successfully!';
            progressText.className = 'text-green-600 font-semibold';
        } else if (jobStatus === 'partial') {
            progressText.textContent = `Generation completed: ${successfulDocs.length} succeeded, ${failedDocs.length} failed.`;
            progressText.className = 'text-yellow-600 font-semibold';
        } else {
            progressText.textContent = `Document generation failed: ${failedDocs.length} documents encountered errors.`;
            progressText.className = 'text-red-600 font-semibold';
        }
    }

    // Clear and display documents
    if (completedDocsDiv) {
        completedDocsDiv.innerHTML = '';
    }

    // Add successful documents
    successfulDocs.forEach(doc => {
        const docKey = `${doc.type}_${doc.level}`;
        addCompletedDocument(docKey, doc);
    });

    // Add failed documents
    failedDocs.forEach(doc => {
        const docKey = `${doc.type}_${doc.level}`;
        addCompletedDocument(docKey, { ...doc, status: 'failed', error: doc.error || 'Generation failed' });
    });

    // Re-enable button
    setTimeout(() => {
        if (generateBtn) generateBtn.disabled = false;
    }, 1000);
}

/**
 * Handle generation error
 */
function handleGenerationError(error) {
    const progressSection = document.getElementById('progressSection');
    const content = document.getElementById('content');
    const generateBtn = document.getElementById('generateBtn');
    const progressText = document.getElementById('progressText');

    if (progressText) {
        progressText.textContent = `Error: ${error.message || 'Generation failed'}`;
        progressText.className = 'text-red-600 font-semibold';
    }

    setTimeout(() => {
        if (progressSection) progressSection.style.display = 'none';
        if (content) content.style.display = 'block';
        if (generateBtn) generateBtn.disabled = false;
        showError(`Failed to generate documents: ${error.message || 'Unknown error'}`);
        if (typeof toast !== 'undefined') {
            toast.error(`Failed to generate documents: ${error.message || 'Unknown error'}`);
        }
    }, 3000);
}

/**
 * Poll job status (fallback if Socket.IO not available)
 */
async function pollJobStatus(jobId) {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
        try {
            const response = await fetch(`${API_BASE}/job-status/${jobId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const job = result.job;

            if (job.status === 'completed' || job.status === 'partial') {
                handleCompletion({ 
                    documents: job.documents,
                    successful: job.documents?.successful || [],
                    failed: job.documents?.failed || [],
                    status: job.status
                });
            } else if (job.status === 'failed') {
                handleGenerationError({ message: job.error || 'Generation failed' });
            } else {
                const total = job.selections?.length || 0;
                const completed = Math.round((job.progress / 100) * total);
                updateProgress({
                    completed: completed,
                    total: total,
                    current: job.currentDocument || 'Processing...',
                    percentage: job.progress
                });

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000);
                } else {
                    handleGenerationError({ message: 'Generation timeout' });
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 2000);
            } else {
                handleGenerationError({ message: 'Failed to check job status' });
            }
        }
    };

    poll();
}

/**
 * Show keyboard shortcuts modal
 */
function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Close keyboard shortcuts modal
 */
function closeKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Show comparison modal
 */
async function showComparisonModal() {
    try {
        const response = await fetch(`${API_BASE}/comparison/${scopeId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch comparison');
        }

        const data = await response.json();
        if (!data.success || !data.comparison) {
            throw new Error('No comparison data available');
        }

        const comparison = data.comparison;
        renderComparisonModal(comparison);
        
        const modal = document.getElementById('comparisonModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Failed to load comparison:', err);
        if (typeof toast !== 'undefined') {
            toast.error('Failed to load comparison');
        }
    }
}

/**
 * Close comparison modal
 */
function closeComparisonModal() {
    const modal = document.getElementById('comparisonModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Render comparison modal content
 */
function renderComparisonModal(comparison) {
    const { original, current, changes } = comparison;

    // Render summary cards
    const summaryDiv = document.getElementById('comparison-summary');
    if (summaryDiv) {
        const deltaCostPercent = original.totalCost > 0 
            ? ((changes.deltaCost / original.totalCost) * 100).toFixed(1)
            : '0';
        const deltaCostSign = changes.deltaCost >= 0 ? '+' : '';
        
        const originalCost = original.totalCost || 0;
        const currentCost = current.totalCost || 0;
        const deltaCost = changes.deltaCost || 0;
        
        summaryDiv.innerHTML = `
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-sm text-gray-500 mb-1">Original Cost</div>
                <div class="text-2xl font-bold text-gray-800">${formatCurrency(originalCost)}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-sm text-gray-500 mb-1">Current Cost</div>
                <div class="text-2xl font-bold text-primary">${formatCurrency(currentCost)}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-sm text-gray-500 mb-1">Change</div>
                <div class="text-2xl font-bold ${deltaCost >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${deltaCostSign}${formatCurrency(Math.abs(deltaCost))}
                </div>
                <div class="text-xs text-gray-500 mt-1">${deltaCostSign}${deltaCostPercent}%</div>
            </div>
        `;
    }

    // Render side-by-side features
    const featuresDiv = document.getElementById('comparison-features');
    if (featuresDiv) {
        const originalFeatures = original.features.filter(f => f.included);
        const currentFeatures = current.features.filter(f => f.included);
        const allFeatureNames = [...new Set([...originalFeatures.map(f => f.name), ...currentFeatures.map(f => f.name)])];

        featuresDiv.innerHTML = `
            <div>
                <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    AI Suggested (${originalFeatures.length} features)
                </h3>
                <div class="space-y-2">
                    ${allFeatureNames.map(name => {
                        const orig = originalFeatures.find(f => f.name === name);
                        const curr = currentFeatures.find(f => f.name === name);
                        const isRemoved = orig && !curr;
                        
                        const origHours = orig ? (orig.hours || orig.estimatedHours || 0) : 0;
                        const origCost = orig ? calculateFeatureCost(orig) : 0;
                        
                        return `
                            <div class="feature-item bg-gray-50 rounded p-3 ${isRemoved ? 'bg-red-50 border border-red-200 line-through opacity-60' : ''}">
                                <div class="font-medium">${escapeHtml(name)}</div>
                                <div class="text-sm text-gray-600">${orig ? `${origHours} hours • ${formatCurrency(origCost)}` : 'Removed'}</div>
                                ${isRemoved ? '<div class="text-xs text-red-600 mt-1">Removed by you</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Your Version (${currentFeatures.length} features)
                </h3>
                <div class="space-y-2">
                    ${allFeatureNames.map(name => {
                        const orig = originalFeatures.find(f => f.name === name);
                        const curr = currentFeatures.find(f => f.name === name);
                        const isAdded = !orig && curr;
                        
                        const currHours = curr ? (curr.hours || curr.estimatedHours || 0) : 0;
                        const currCost = curr ? calculateFeatureCost(curr) : 0;
                        
                        return `
                            <div class="feature-item bg-gray-50 rounded p-3 ${isAdded ? 'bg-green-50 border border-green-200' : ''}">
                                <div class="font-medium">${escapeHtml(name)}</div>
                                <div class="text-sm text-gray-600">${curr ? `${currHours} hours • ${formatCurrency(currCost)}` : 'Not included'}</div>
                                ${isAdded ? '<div class="text-xs text-green-600 mt-1">Added by you</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Render change summary
    const changesDiv = document.getElementById('comparison-changes');
    if (changesDiv) {
        changesDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-3">Summary of Changes</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <div class="text-sm font-medium text-green-700 mb-2">✓ Added (${changes.added.length})</div>
                    <ul class="text-sm text-gray-700 space-y-1">
                        ${changes.added.map(f => {
                            const hours = f.hours || f.estimatedHours || 0;
                            const cost = f.cost || calculateFeatureCost(f) || 0;
                            return `<li>• ${escapeHtml(f.name)} (+${hours} hours, +${formatCurrency(cost)})</li>`;
                        }).join('')}
                        ${changes.added.length === 0 ? '<li class="text-gray-400">No features added</li>' : ''}
                    </ul>
                </div>
                <div>
                    <div class="text-sm font-medium text-red-700 mb-2">✗ Removed (${changes.removed.length})</div>
                    <ul class="text-sm text-gray-700 space-y-1">
                        ${changes.removed.map(f => {
                            const hours = f.hours || f.estimatedHours || 0;
                            const cost = f.cost || calculateFeatureCost(f) || 0;
                            return `<li>• ${escapeHtml(f.name)} (-${hours} hours, -${formatCurrency(cost)})</li>`;
                        }).join('')}
                        ${changes.removed.length === 0 ? '<li class="text-gray-400">No features removed</li>' : ''}
                    </ul>
                </div>
            </div>
            
            <div class="mt-4 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    Net change: <span class="font-semibold ${(changes.deltaCost || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${(changes.deltaHours || 0) >= 0 ? '+' : ''}${changes.deltaHours || 0} hours, ${(changes.deltaCost || 0) >= 0 ? '+' : ''}${formatCurrency(Math.abs(changes.deltaCost || 0))}
                    </span>
                </div>
                <div class="space-x-3">
                    <button onclick="revertAllChanges()" 
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
                        Revert All Changes
                    </button>
                    <button onclick="closeComparisonModal()" 
                            class="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Calculate feature cost
 */
function calculateFeatureCost(feature) {
    if (!feature || typeof feature !== 'object') {
        return 0;
    }
    
    const hours = parseFloat(feature.hours) || parseFloat(feature.estimatedHours) || 25;
    const complexity = parseFloat(feature.complexity) || 2;
    const baseRate = 2000;
    
    if (isNaN(hours) || isNaN(complexity) || hours < 0 || complexity < 0) {
        return 0;
    }
    
    const cost = hours * baseRate * (complexity / 2) * 1.2;
    return Math.round(cost) || 0;
}

/**
 * Revert all changes to original scope
 */
async function revertAllChanges() {
    if (!confirm('Are you sure you want to revert all changes to the original scope?')) {
        return;
    }

    try {
        // Restore original features
        currentFeatures = JSON.parse(JSON.stringify(originalFeatures));
        
        // Re-render and update
        renderFeatures();
        await updateScope();
        
        // Close modal
        closeComparisonModal();
        
        if (typeof toast !== 'undefined') {
            toast.success('All changes reverted to original scope');
        }
    } catch (err) {
        console.error('Failed to revert changes:', err);
        if (typeof toast !== 'undefined') {
            toast.error('Failed to revert changes');
        }
    }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    // Handle null, undefined, NaN, or invalid values
    if (amount === null || amount === undefined || isNaN(amount) || amount < 0) {
        return '₹0';
    }
    // Ensure amount is a number
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return `₹${numAmount.toLocaleString('en-IN')}`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
function showError(message) {
    const error = document.getElementById('error');
    if (error) {
        error.textContent = message;
        error.classList.remove('hidden');
        
        setTimeout(() => {
            error.classList.add('hidden');
        }, 5000);
    }
    
    if (typeof toast !== 'undefined') {
        toast.error(message);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
