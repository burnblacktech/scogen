/**
 * Module Utilities
 * Centralized utilities for module operations, complexity mapping, and related helpers
 */

const { complexityCache } = require('./cache');

/**
 * Standard complexity to days mapping
 * Used consistently across Estimator, Refiner, Level Generator, and other modules
 */
const COMPLEXITY_DAYS = {
  low: 1,
  med: 2,
  medium: 2,
  high: 4,
  hig: 4 // Handle truncated keys
};

/**
 * Get effort days for a complexity level (cached)
 * @param {string} complexity - Complexity level (low, med, medium, high)
 * @returns {number} - Effort in days
 */
function getComplexityDays(complexity) {
  if (!complexity) return 2; // Default medium
  
  // Check cache first
  const cacheKey = `complexity:${String(complexity).toLowerCase()}`;
  const cached = complexityCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Calculate and cache
  const normalized = String(complexity).toLowerCase();
  const key = normalized.substring(0, 3); // Handle 'medium' -> 'med', 'high' -> 'hig'
  const result = COMPLEXITY_DAYS[key] || COMPLEXITY_DAYS[normalized] || 2;
  
  complexityCache.set(cacheKey, result);
  return result;
}

/**
 * Normalize complexity key (handles variations like 'medium' vs 'med')
 * @param {string} complexity - Complexity string
 * @returns {string} - Normalized complexity key (low, med, high)
 */
function normalizeComplexity(complexity) {
  if (!complexity) return 'med';
  
  const normalized = String(complexity).toLowerCase();
  const key = normalized.substring(0, 3);
  
  // Map variations to standard keys
  if (key === 'low' || normalized === 'simple') return 'low';
  if (key === 'med' || normalized === 'medium' || normalized === 'standard') return 'med';
  if (key === 'hig' || normalized === 'high' || normalized === 'complex') return 'high';
  
  return 'med'; // Default
}

/**
 * Validate and normalize module array
 * @param {*} modules - Modules input (array or other)
 * @param {Object} logger - Logger instance (optional)
 * @returns {Array} - Normalized module array
 */
function normalizeModuleArray(modules, logger) {
  if (!modules) return [];
  
  if (!Array.isArray(modules)) {
    if (logger) {
      logger.warn('normalizeModuleArray received non-array input', { 
        type: typeof modules,
        value: modules 
      });
    }
    return [];
  }
  
  return modules.filter(Boolean); // Remove null/undefined entries
}

/**
 * Safe array access - ensures value is an array
 * @param {*} value - Value to check
 * @param {Array} defaultValue - Default value if not an array
 * @returns {Array} - Array value or default
 */
function ensureArray(value, defaultValue = []) {
  if (Array.isArray(value)) return value;
  return defaultValue;
}

/**
 * Safe array access with fallback parsing
 * @param {*} value - Value to check (can be array, string JSON, or other)
 * @param {Array} defaultValue - Default value if parsing fails
 * @returns {Array} - Array value
 */
function ensureArrayOrParse(value, defaultValue = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore parse errors
    }
  }
  return defaultValue;
}

/**
 * Calculate module effort considering complexity, reuse, and dependencies
 * @param {Object} module - Module object
 * @param {Object} options - Options including library, domainContext
 * @returns {number} - Effort in days
 */
function calculateModuleEffort(module, options = {}) {
  const { library, domainContext } = options;
  
  // Base effort from complexity
  let effort = getComplexityDays(module.complexity);
  
  // Apply reuse discount
  if (module.reusable && library && domainContext) {
    const reuse = library.getReusableModule(module.name, domainContext.industry || 'generic');
    if (reuse && reuse.available) {
      effort *= 0.5;
    }
  }
  
  // Minimum effort
  effort = Math.max(1, effort);
  
  // Apply dependency complexity (if dependencies exist)
  if (module.deps && Array.isArray(module.deps) && module.deps.length > 0) {
    // Simple dependency tax: +10% per dependency beyond 2
    const depCount = module.deps.length;
    if (depCount > 2) {
      const integrationTax = (depCount - 2) * 0.1;
      effort *= (1 + integrationTax);
    }
  }
  
  return Math.ceil(effort);
}

/**
 * Calculate total effort for multiple modules
 * @param {Array} modules - Array of module objects
 * @param {Object} options - Options including library, domainContext
 * @returns {number} - Total effort in days
 */
function calculateTotalEffort(modules, options = {}) {
  const activeModules = modules.filter(m => m.priority !== 'deferred');
  return activeModules.reduce((sum, mod) => sum + calculateModuleEffort(mod, options), 0);
}

module.exports = {
  COMPLEXITY_DAYS,
  getComplexityDays,
  normalizeComplexity,
  normalizeModuleArray,
  ensureArray,
  ensureArrayOrParse,
  calculateModuleEffort,
  calculateTotalEffort
};

