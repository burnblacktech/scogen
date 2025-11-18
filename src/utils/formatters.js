/**
 * Shared Formatting Utilities
 * Centralized formatting functions to reduce code duplication
 */

class Formatters {
  /**
   * Format currency in Indian format (₹ with Indian number system)
   * @param {number|string|object} amount - Amount to format (can be number, string, or object with total/amount property)
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted currency string
   */
  static formatIndianCurrency(amount, options = {}) {
    if (amount === null || amount === undefined) {
      return options.returnTBD ? 'TBD' : '₹0';
    }

    // Handle string input (try to parse)
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return this.formatIndianCurrency(parsed, options);
      }
      return options.returnTBD ? 'TBD' : '₹0';
    }

    // Extract numeric value from object if needed
    const numAmount = typeof amount === 'object' 
      ? (amount.total || amount.amount || 0) 
      : amount;

    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return options.returnTBD ? 'TBD' : '₹0';
    }

    if (numAmount === 0) {
      return '₹0';
    }

    const {
      useShortForm = true, // Use Cr/L/K notation
      showSymbol = true, // Show ₹ symbol
      locale = 'en-IN'
    } = options;

    if (useShortForm) {
      // Short form: Crores, Lakhs, Thousands
      if (numAmount >= 10000000) {
        return `${showSymbol ? '₹' : ''}${(numAmount / 10000000).toFixed(2)}Cr`;
      } else if (numAmount >= 100000) {
        return `${showSymbol ? '₹' : ''}${(numAmount / 100000).toFixed(2)}L`;
      } else if (numAmount >= 1000) {
        return `${showSymbol ? '₹' : ''}${(numAmount / 1000).toFixed(1)}K`;
      }
    }

    // Full number format
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);

    return showSymbol ? `₹${formatted}` : formatted;
  }

  /**
   * Format currency using Intl.NumberFormat (standard format)
   * @param {number|object} amount - Amount to format
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted currency string
   */
  static formatCurrency(amount, options = {}) {
    if (amount === null || amount === undefined) {
      return '₹0';
    }

    const numAmount = typeof amount === 'object' 
      ? (amount.total || amount.amount || 0) 
      : amount;

    if (isNaN(numAmount)) {
      return '₹0';
    }

    const {
      currency = 'INR',
      locale = 'en-IN',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
      showSymbol = true
    } = options;

    const formatted = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits
    }).format(numAmount);

    return formatted;
  }

  /**
   * Format number with Indian locale
   * @param {number} num - Number to format
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted number string
   */
  static formatNumber(num, options = {}) {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }

    const {
      locale = 'en-IN',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0
    } = options;

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits
    }).format(num);
  }

  /**
   * Format timeline (days to weeks/months)
   * @param {number|object} timeline - Timeline in days or object with days/weeks
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted timeline string
   */
  static formatTimeline(timeline, options = {}) {
    if (!timeline) {
      return 'Not specified';
    }

    const {
      preferWeeks = true,
      showDays = true
    } = options;

    let days = typeof timeline === 'object' 
      ? (timeline.days || timeline.recommendedDays || 0)
      : timeline;

    if (days === 0 && typeof timeline === 'object' && timeline.weeks) {
      days = timeline.weeks * 5;
    }

    if (days === 0) {
      return 'Not specified';
    }

    const weeks = Math.round(days / 5);
    const months = Math.round(days / 20);

    if (preferWeeks && weeks > 0) {
      if (showDays && days % 5 !== 0) {
        return `${weeks} weeks (${days} days)`;
      }
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    }

    if (months > 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }

    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  /**
   * Format percentage
   * @param {number} value - Value to format (0-1 or 0-100)
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted percentage string
   */
  static formatPercentage(value, options = {}) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0%';
    }

    const {
      asDecimal = false, // If true, value is 0-1, else 0-100
      decimals = 0
    } = options;

    const percentage = asDecimal ? value * 100 : value;
    return `${percentage.toFixed(decimals)}%`;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') {
      return String(str);
    }

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return str.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = Formatters;

