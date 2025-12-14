const Storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch (e) {
      console.error('שגיאת קריאה:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('שגיאת שמירה:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },

  // Specific
  saveOrders(orders) { this.set('orders', orders); },
  getOrders() { return this.get('orders') || []; },
  saveTeam(team) { this.set('team', team); },
  getTeam() { return this.get('team') || []; },
  saveUser(user) { this.set('user', user); },
  getUser() { return this.get('user') || null; },
  saveSettings(settings) { this.set('settings', settings); },
  getSettings() { return this.get('settings') || { menu: defaultMenu }; },
  saveHistory(history) { this.set('history', history); },
  getHistory() { return this.get('history') || []; }
};

const defaultMenu = {
  drinks: { 'הפוך': '☕ הפוך', 'אספרסו': '☕ אספרסו', 'אמריקנו': '☕ אמריקנו', 'קפוצ\'ינו': '☕ קפוצ\'ינו', 'לאטה': '☕ לאטה', 'מקיאטו': '☕ מקיאטו' },
  sizes: { 'דל': '📊 דל', 'כפול': '📊 כפול', 'פעמיים': '📊 פעמיים', 'גדול': '📊 גדול', 'קטן': '📊 קטן' },
  milks: { 'שקדים': '🥛 שקדים', 'סויה': '🥛 סויה', 'מפורק': '🥛 מפורק', 'קוקוס': '🥛 קוקוס', 'שיבולת': '🥛 שיבולת' },
  extras: { 'סירופ': '🍯 סירופ', 'וניל': '🍯 וניל', 'קרמל': '🍯 קרמל', 'שוקולד': '🍯 שוקולד', 'קצפת': '🍯 קצפת' }
};