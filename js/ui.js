/**
 * CoffeeTeam Pro - UI Utilities
 * DOM manipulation and UI helpers
 */

const UI = {
  /**
   * Get element by selector
   */
  $(selector) {
    return document.querySelector(selector);
  },

  /**
   * Get all elements by selector
   */
  $$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Show element
   */
  show(element) {
    if (typeof element === 'string') {
      element = this.$(element);
    }
    element?.classList.remove('hidden');
  },

  /**
   * Hide element
   */
  hide(element) {
    if (typeof element === 'string') {
      element = this.$(element);
    }
    element?.classList.add('hidden');
  },

  /**
   * Toggle element visibility
   */
  toggle(element) {
    if (typeof element === 'string') {
      element = this.$(element);
    }
    element?.classList.toggle('hidden');
  },

  /**
   * Set text content
   */
  setText(selector, text) {
    const el = this.$(selector);
    if (el) el.textContent = text;
  },

  /**
   * Set HTML content
   */
  setHTML(selector, html) {
    const el = this.$(selector);
    if (el) el.innerHTML = html;
  },

  /**
   * Add class
   */
  addClass(selector, className) {
    const el = this.$(selector);
    if (el) el.classList.add(className);
  },

  /**
   * Remove class
   */
  removeClass(selector, className) {
    const el = this.$(selector);
    if (el) el.classList.remove(className);
  },

  /**
   * Toggle class
   */
  toggleClass(selector, className) {
    const el = this.$(selector);
    if (el) el.classList.toggle(className);
  },

  /**
   * Show toast notification
   */
  toast(message, type = 'success', duration = 3000) {
    const container = this.$('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Show error toast
   */
  error(message) {
    this.toast(message, 'error');
  },

  /**
   * Show warning toast
   */
  warning(message) {
    this.toast(message, 'warning');
  },

  /**
   * Show info toast
   */
  info(message) {
    this.toast(message, 'info');
  },

  /**
   * Confirm dialog
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * Prompt dialog
   */
  prompt(message, defaultValue = '') {
    return window.prompt(message, defaultValue);
  },

  /**
   * Create order card HTML
   */
  createOrderCard(order, showAcceptBtn = false) {
    const isCompleted = order.status === 'completed';
    const statusClass = isCompleted ? 'completed' : '';
    
    const items = order.items?.length
      ? order.items.map(item => `<div class="order-item">${item}</div>`).join('')
      : `<div class="order-item">${order.text}</div>`;

    const acceptBtn = showAcceptBtn
      ? `<div class="order-actions">
           <button class="btn-accept" onclick="App.acceptOrder(${order.id})" ${isCompleted ? 'disabled' : ''}>
             ${isCompleted ? '✅ הושלם' : '✓ קיבלתי'}
           </button>
         </div>`
      : '';

    return `
      <div class="order-card ${statusClass}">
        <div class="order-header">
          <div class="order-number">#${order.id}</div>
          <div class="order-time">${order.time}</div>
        </div>
        <div class="order-items">${items}</div>
        <div class="order-meta">
          קופאי: ${order.cashier}
          ${order.barista ? ` | בריסטה: ${order.barista}` : ''}
        </div>
        ${acceptBtn}
      </div>
    `;
  },

  /**
   * Create team member card HTML
   */
  createTeamCard(member) {
    const roleEmojis = {
      'cashier': '👨‍💼',
      'barista': '☕',
      'manager': '👑'
    };

    const roleNames = {
      'cashier': 'קופאי',
      'barista': 'בריסטה',
      'manager': 'מנהל'
    };

    const emoji = roleEmojis[member.role] || '👤';
    const roleName = roleNames[member.role] || member.role;

    return `
      <div class="team-member ${member.server ? 'server' : ''}">
        <div class="team-icon">${emoji}</div>
        <div class="team-name">${member.name}</div>
        <div class="team-role">${roleName}</div>
        ${member.server ? '<div class="team-status">🔴 שרת</div>' : ''}
      </div>
    `;
  },

  /**
   * Format time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format duration
   */
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * Vibrate device
   */
  vibrate(pattern = 200) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  /**
   * Play sound
   */
  playSound(name) {
    try {
      const audio = new Audio(`assets/sounds/${name}.mp3`);
      audio.play().catch(e => console.log('[UI] Sound play failed:', e));
    } catch (error) {
      console.log('[UI] Sound not available:', name);
    }
  },

  /**
   * Scroll to element
   */
  scrollTo(selector) {
    const el = this.$(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Disable element
   */
  disable(selector) {
    const el = this.$(selector);
    if (el) el.disabled = true;
  },

  /**
   * Enable element
   */
  enable(selector) {
    const el = this.$(selector);
    if (el) el.disabled = false;
  },

  /**
   * Get form data
   */
  getFormData(formSelector) {
    const form = this.$(formSelector);
    if (!form) return null;
    
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  },

  /**
   * Clear form
   */
  clearForm(formSelector) {
    const form = this.$(formSelector);
    if (form) form.reset();
  },

  /**
   * Add event listener
   */
  on(selector, event, handler) {
    const el = this.$(selector);
    if (el) el.addEventListener(event, handler);
  },

  /**
   * Remove event listener
   */
  off(selector, event, handler) {
    const el = this.$(selector);
    if (el) el.removeEventListener(event, handler);
  },

  /**
   * Delegate event
   */
  delegate(parentSelector, childSelector, event, handler) {
    const parent = this.$(parentSelector);
    if (!parent) return;

    parent.addEventListener(event, (e) => {
      if (e.target.matches(childSelector)) {
        handler(e);
      }
    });
  }
};

console.log('[UI] Module loaded');