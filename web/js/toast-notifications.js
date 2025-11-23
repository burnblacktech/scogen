/**
 * Toast Notifications
 * 
 * Provides user feedback through toast notifications
 */

class ToastNotifications {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Show success toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  /**
   * Show error toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  error(message, duration = 5000) {
    this.show(message, 'error', duration);
  }

  /**
   * Show warning toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  warning(message, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  /**
   * Show info toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    const colors = {
      success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✓' },
      error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '✗' },
      warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: '⚠' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ' }
    };

    const color = colors[type] || colors.info;

    toast.className = `${color.bg} ${color.border} ${color.text} border-2 rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-md transform transition-all duration-300 translate-x-full opacity-0`;
    toast.innerHTML = `
      <div class="flex-shrink-0 w-6 h-6 rounded-full ${color.bg} flex items-center justify-center font-bold">
        ${color.icon}
      </div>
      <div class="flex-1 text-sm font-medium">${this.escapeHtml(message)}</div>
      <button onclick="this.parentElement.remove()" class="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    this.container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
      toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }
  }

  /**
   * Remove toast
   * @param {HTMLElement} toast - Toast element to remove
   */
  remove(toast) {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
const toast = new ToastNotifications();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastNotifications;
}

