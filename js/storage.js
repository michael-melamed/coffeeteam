/**
 * CoffeeTeam Pro - Storage Management
 * LocalStorage wrapper with error handling
 */

const Storage = {
  keys: {
    ORDERS: 'coffeeteam_orders',
    TEAM: 'coffeeteam_team',
    USER: 'coffeeteam_user',
    SETTINGS: 'coffeeteam_settings',
    SESSION: 'coffeeteam_session'
  },

  /**
   * Get item from localStorage
   */
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Storage] Get error:', error);
      return null;
    }
  },

  /**
   * Set item in localStorage
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('[Storage] Set error:', error);
      
      // Handle quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.error('[Storage] Retry failed:', retryError);
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('[Storage] Remove error:', error);
      return false;
    }
  },

  /**
   * Clear all CoffeeTeam data
   */
  clear() {
    try {
      Object.values(this.keys).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('[Storage] Clear error:', error);
      return false;
    }
  },

  /**
   * Cleanup old data (keep last 100 orders)
   */
  cleanup() {
    try {
      const orders = this.getOrders();
      if (orders.length > 100) {
        this.saveOrders(orders.slice(0, 100));
      }
    } catch (error) {
      console.error('[Storage] Cleanup error:', error);
    }
  },

  // ========== ORDERS ==========

  getOrders() {
    const orders = this.get(this.keys.ORDERS);
    return Array.isArray(orders) ? orders : [];
  },

  saveOrders(orders) {
    return this.set(this.keys.ORDERS, orders);
  },

  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    return this.saveOrders(orders);
  },

  updateOrder(orderId, updates) {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      return this.saveOrders(orders);
    }
    
    return false;
  },

  deleteOrder(orderId) {
    const orders = this.getOrders();
    const filtered = orders.filter(o => o.id !== orderId);
    return this.saveOrders(filtered);
  },

  clearOrders() {
    return this.saveOrders([]);
  },

  // ========== TEAM ==========

  getTeam() {
    const team = this.get(this.keys.TEAM);
    return Array.isArray(team) ? team : [];
  },

  saveTeam(team) {
    return this.set(this.keys.TEAM, team);
  },

  addTeamMember(member) {
    const team = this.getTeam();
    
    // Don't add duplicate
    if (!team.find(m => m.id === member.id)) {
      team.push(member);
      return this.saveTeam(team);
    }
    
    return true;
  },

  removeTeamMember(memberId) {
    const team = this.getTeam();
    const filtered = team.filter(m => m.id !== memberId);
    return this.saveTeam(filtered);
  },

  updateTeamMember(memberId, updates) {
    const team = this.getTeam();
    const index = team.findIndex(m => m.id === memberId);
    
    if (index !== -1) {
      team[index] = { ...team[index], ...updates };
      return this.saveTeam(team);
    }
    
    return false;
  },

  clearTeam() {
    return this.saveTeam([]);
  },

  // ========== USER ==========

  getUser() {
    return this.get(this.keys.USER);
  },

  saveUser(user) {
    return this.set(this.keys.USER, user);
  },

  clearUser() {
    return this.remove(this.keys.USER);
  },

  // ========== SETTINGS ==========

  getSettings() {
    return this.get(this.keys.SETTINGS) || {
      sound: true,
      notifications: true,
      vibration: true,
      theme: 'light',
      language: 'he'
    };
  },

  saveSettings(settings) {
    return this.set(this.keys.SETTINGS, settings);
  },

  updateSettings(updates) {
    const settings = this.getSettings();
    return this.saveSettings({ ...settings, ...updates });
  },

  // ========== SESSION ==========

  getSession() {
    return this.get(this.keys.SESSION);
  },

  saveSession(session) {
    return this.set(this.keys.SESSION, {
      ...session,
      timestamp: Date.now()
    });
  },

  clearSession() {
    return this.remove(this.keys.SESSION);
  },

  // ========== EXPORT/IMPORT ==========

  exportData() {
    try {
      return {
        orders: this.getOrders(),
        team: this.getTeam(),
        settings: this.getSettings(),
        timestamp: Date.now(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('[Storage] Export error:', error);
      return null;
    }
  },

  importData(data) {
    try {
      if (data.orders) this.saveOrders(data.orders);
      if (data.team) this.saveTeam(data.team);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (error) {
      console.error('[Storage] Import error:', error);
      return false;
    }
  },

  // ========== UTILITIES ==========

  getStorageSize() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return (total / 1024).toFixed(2) + ' KB';
    } catch (error) {
      return 'Unknown';
    }
  },

  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Check storage availability on load
if (!Storage.isAvailable()) {
  console.warn('[Storage] localStorage not available');
}

console.log('[Storage] Initialized');