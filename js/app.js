/**
 * CoffeeTeam Pro - Main Application
 * Production-ready coffee shop team management system
 */

const App = {
  // State
  state: {
    role: null,
    name: null,
    orders: [],
    team: [],
    counter: 1,
    isOnline: false
  },

  // Configuration
  config: {
    MANAGER_PASSWORD: '1234',
    MAX_ORDERS_HISTORY: 100,
    ORDER_TIMEOUT: 3600000 // 1 hour
  },

  roles: {
    cashier: { emoji: '👨‍💼', name: 'קופאי' },
    barista: { emoji: '☕', name: 'בריסטה' },
    manager: { emoji: '👑', name: 'מנהל' }
  },

  /**
   * Initialize application
   */
  init() {
    console.log('☕ CoffeeTeam Pro v1.0.0');
    console.log('🎯 Production Mode - הפסנתריה x לייב קוד');

    // Hide loading screen
    setTimeout(() => {
      UI.hide('#loading');
      UI.show('#welcome');
    }, 1000);

    // Load saved data
    this.loadData();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize P2P
    this.initP2P();

    // Check URL parameters
    this.checkURLParams();

    // Setup online/offline detection
    this.setupNetworkDetection();

    console.log('[App] Initialized');
  },

  /**
   * Load saved data from storage
   */
  loadData() {
    const savedOrders = Storage.getOrders();
    const savedTeam = Storage.getTeam();
    const savedUser = Storage.getUser();

    if (savedOrders.length) {
      this.state.orders = savedOrders;
      this.state.counter = Math.max(...savedOrders.map(o => o.id)) + 1;
      console.log('[App] Loaded', savedOrders.length, 'orders');
    }

    if (savedTeam.length) {
      this.state.team = savedTeam;
      console.log('[App] Loaded', savedTeam.length, 'team members');
    }

    // Auto-login check
    if (savedUser && savedUser.role && savedUser.name) {
      const autoLogin = confirm(
        `התחבר בתור ${savedUser.name} (${this.roles[savedUser.role].name})?`
      );
      
      if (autoLogin) {
        this.state.role = savedUser.role;
        this.state.name = savedUser.name;
        setTimeout(() => this.startApp(), 100);
      }
    }
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Role selection
    UI.$$('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        this.selectRole(role);
      });
    });

    // Auth modal
    UI.$('#auth-btn')?.addEventListener('click', () => this.authenticate());
    UI.$('#auth-cancel')?.addEventListener('click', () => this.closeModal('#auth-modal'));
    UI.$('#pwd')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.authenticate();
    });

    // Name modal
    UI.$('#name-btn')?.addEventListener('click', () => this.setName());
    UI.$('#username')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.setName();
    });

    // Connection modal
    UI.$('#connection-cancel')?.addEventListener('click', () => {
      this.closeModal('#connection-modal');
    });

    // Header buttons
    UI.$('#refresh-btn')?.addEventListener('click', () => this.refresh());
    UI.$('#info-btn')?.addEventListener('click', () => this.showInfo());
    UI.$('#logout-btn')?.addEventListener('click', () => this.logout());

    // Cashier - Voice
    UI.$('#mic-btn')?.addEventListener('click', () => this.toggleMic());
    UI.$('#send-btn')?.addEventListener('click', () => this.sendOrder());

    // Manager - Clear history
    UI.$('#clear-history-btn')?.addEventListener('click', () => this.clearHistory());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + M = Toggle mic
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && this.state.role === 'cashier') {
        e.preventDefault();
        this.toggleMic();
      }
    });
  },

  /**
   * Initialize P2P communication
   */
  initP2P() {
    P2P.init();

    // Handle incoming messages
    P2P.onMessage = (message) => {
      console.log('[App] P2P message:', message.type);

      switch (message.type) {
        case 'order':
          this.handleIncomingOrder(message.data);
          break;
        case 'order_update':
          this.handleOrderUpdate(message.data);
          break;
        case 'team_update':
          this.handleTeamUpdate(message.data);
          break;
      }
    };

    // Handle peer events
    P2P.onPeerJoin = (peer) => {
      console.log('[App] Peer joined:', peer.name);
      UI.toast(`${peer.name} הצטרף`, 'info', 2000);
      this.syncWithPeer();
    };

    P2P.onPeerLeave = (peer) => {
      console.log('[App] Peer left:', peer.name);
    };

    // Connection status
    P2P.onConnectionChange = (connected) => {
      this.updateConnectionStatus(connected);
    };
  },

  /**
   * Check URL parameters for shortcuts
   */
  checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    
    if (role && this.roles[role]) {
      setTimeout(() => this.selectRole(role), 500);
    }
  },

  /**
   * Setup network detection
   */
  setupNetworkDetection() {
    window.addEventListener('online', () => {
      console.log('[App] Network online');
      UI.toast('חזרת לרשת', 'success', 2000);
      this.updateConnectionStatus(true);
    });

    window.addEventListener('offline', () => {
      console.log('[App] Network offline');
      UI.toast('אין חיבור לרשת', 'warning', 2000);
      this.updateConnectionStatus(false);
    });
  },

  /**
   * Select role
   */
  selectRole(role) {
    this.state.role = role;
    console.log('[App] Role selected:', role);

    if (role === 'manager') {
      this.showModal('#auth-modal');
    } else {
      this.showModal('#name-modal');
    }
  },

  /**
   * Authenticate manager
   */
  authenticate() {
    const pwd = UI.$('#pwd').value;

    if (pwd === this.config.MANAGER_PASSWORD) {
      this.closeModal('#auth-modal');
      UI.$('#pwd').value = '';
      this.showModal('#name-modal');
    } else {
      UI.error('סיסמה שגויה');
      UI.vibrate([100, 50, 100]);
    }
  },

  /**
   * Set user name
   */
  setName() {
    const username = UI.$('#username').value.trim();

    if (!username) {
      UI.warning('נא להזין שם');
      return;
    }

    this.state.name = username;
    UI.$('#username').value = '';
    this.closeModal('#name-modal');
    
    // Show connection modal briefly
    this.showModal('#connection-modal');
    UI.setText('#connection-text', 'מתחבר למערכת...');
    
    setTimeout(() => {
      this.closeModal('#connection-modal');
      this.startApp();
    }, 1500);
  },

  /**
   * Start application
   */
  startApp() {
    console.log('[App] Starting app for', this.state.name, 'as', this.state.role);

    // Hide welcome, show app
    UI.hide('#welcome');
    UI.show('#app');

    // Update header
    const role = this.roles[this.state.role];
    UI.setText('#avatar', role.emoji);
    UI.setText('#user-name', this.state.name);
    UI.setText('#user-role', role.name);

    // Show interface
    UI.show(`#${this.state.role}`);

    // Save user
    Storage.saveUser({
      role: this.state.role,
      name: this.state.name,
      timestamp: Date.now()
    });

    // Add to team
    this.addTeamMember({
      id: P2P.deviceId,
      name: this.state.name,
      role: this.state.role,
      server: this.state.team.length === 0,
      timestamp: Date.now()
    });

    // Initialize role-specific features
    if (this.state.role === 'cashier') {
      this.initCashier();
    }

    // Render initial data
    this.render();

    // Announce to network
    P2P.announce();

    // Update connection status
    this.updateConnectionStatus(P2P.isOnline());

    // Welcome message
    UI.toast(`ברוכים הבאים, ${this.state.name}! 👋`, 'success');
  },

  /**
   * Initialize cashier interface
   */
  initCashier() {
    const success = Voice.init();

    if (!success) {
      UI.error('זיהוי קולי לא נתמך בדפדפן זה');
      UI.toast('השתמש ב-Chrome או Edge לזיהוי קולי', 'warning', 5000);
      return;
    }

    Voice.onResult = (transcript) => {
      UI.setText('#transcript', transcript);

      if (transcript.length > 2) {
        this.parseVoiceOrder(transcript);
      }
    };

    Voice.onError = (error) => {
      console.error('[App] Voice error:', error);
      UI.error('שגיאה בזיהוי קולי');
      this.stopMic();
    };

    console.log('[App] Cashier initialized');
  },

  /**
   * Toggle microphone
   */
  toggleMic() {
    if (Voice.isListening) {
      this.stopMic();
    } else {
      this.startMic();
    }
  },

  /**
   * Start microphone
   */
  startMic() {
    const success = Voice.start();

    if (!success) {
      UI.error('לא ניתן להתחיל הקלטה');
      return;
    }

    UI.addClass('#mic-btn', 'active');
    UI.setText('#mic-status', '🔴 לחץ לעצירה');
    UI.show('#listening-box');
    UI.hide('#parsed-box');
    UI.setText('#transcript', '...');
  },

  /**
   * Stop microphone
   */
  stopMic() {
    Voice.stop();
    UI.removeClass('#mic-btn', 'active');
    UI.setText('#mic-status', 'לחץ על המיקרופון');
  },

  /**
   * Parse voice order
   */
  parseVoiceOrder(transcript) {
    const parsed = Voice.parse(transcript);
    const items = Voice.formatParsed(parsed);

    if (items.length) {
      const html = items.map(item => 
        `<div class="parsed-item">${item}</div>`
      ).join('');

      UI.setHTML('#parsed-items', html);
      UI.show('#parsed-box');
    }
  },

  /**
   * Send order
   */
  sendOrder() {
    const transcript = Voice.currentTranscript;

    if (!transcript) {
      UI.warning('אין הזמנה לשלוח');
      return;
    }

    const parsed = Voice.parse(transcript);
    const items = Voice.formatParsed(parsed);

    const order = {
      id: this.state.counter++,
      text: transcript,
      items: items.length ? items : [transcript],
      time: UI.formatTime(Date.now()),
      timestamp: Date.now(),
      cashier: this.state.name,
      status: 'pending'
    };

    // Add to state
    this.state.orders.unshift(order);

    // Save to storage
    Storage.saveOrders(this.state.orders);

    // Broadcast to network
    P2P.broadcastOrder(order);

    // Update UI
    this.render();

    // Reset voice
    this.stopMic();
    Voice.currentTranscript = '';
    UI.setText('#transcript', '');
    UI.hide('#parsed-box');

    // Feedback
    UI.toast('✅ הזמנה נשלחה!', 'success');
    UI.vibrate(200);

    console.log('[App] Order sent:', order.id);
  },

  /**
   * Accept order (barista)
   */
  acceptOrder(orderId) {
    const order = this.state.orders.find(o => o.id === orderId);

    if (!order) {
      UI.error('הזמנה לא נמצאה');
      return;
    }

    if (order.status === 'completed') {
      return;
    }

    // Update order
    order.status = 'completed';
    order.barista = this.state.name;
    order.completedAt = Date.now();

    // Save
    Storage.saveOrders(this.state.orders);

    // Broadcast
    P2P.broadcastOrderUpdate(order);

    // Update UI
    this.render();

    // Feedback
    UI.toast('✅ הזמנה התקבלה!', 'success');
    UI.vibrate(200);

    console.log('[App] Order accepted:', order.id);
  },

  /**
   * Handle incoming order from network
   */
  handleIncomingOrder(order) {
    console.log('[App] Incoming order:', order.id);

    // Check if order already exists
    if (this.state.orders.find(o => o.id === order.id)) {
      return;
    }

    // Add to state
    this.state.orders.unshift(order);

    // Update counter if needed
    if (order.id >= this.state.counter) {
      this.state.counter = order.id + 1;
    }

    // Save
    Storage.saveOrders(this.state.orders);

    // Update UI
    this.render();

    // Notification for barista
    if (this.state.role === 'barista') {
      UI.toast('🔔 הזמנה חדשה!', 'info');
      UI.vibrate([200, 100, 200]);
    }
  },

  /**
   * Handle order update from network
   */
  handleOrderUpdate(updatedOrder) {
    console.log('[App] Order update:', updatedOrder.id);

    const index = this.state.orders.findIndex(o => o.id === updatedOrder.id);

    if (index !== -1) {
      this.state.orders[index] = updatedOrder;
      Storage.saveOrders(this.state.orders);
      this.render();
    }
  },

  /**
   * Handle team update from network
   */
  handleTeamUpdate(team) {
    console.log('[App] Team update');
    this.state.team = team;
    Storage.saveTeam(team);
    this.render();
  },

  /**
   * Add team member
   */
  addTeamMember(member) {
    // Check if already exists
    if (this.state.team.find(m => m.id === member.id)) {
      return;
    }

    this.state.team.push(member);
    Storage.saveTeam(this.state.team);

    // Broadcast
    P2P.broadcastTeamUpdate(this.state.team);

    this.render();
  },

  /**
   * Sync data with peer
   */
  syncWithPeer() {
    // Send current orders to new peer
    if (this.state.orders.length) {
      this.state.orders.forEach(order => {
        P2P.broadcastOrder(order);
      });
    }
  },

  /**
   * Render UI based on role
   */
  render() {
    if (this.state.role === 'cashier') {
      this.renderCashierOrders();
    } else if (this.state.role === 'barista') {
      this.renderBaristaOrders();
    } else if (this.state.role === 'manager') {
      this.renderManagerDashboard();
    }
  },

  /**
   * Render cashier orders
   */
  renderCashierOrders() {
    const recent = this.state.orders.slice(0, 10);
    const html = recent.map(o => UI.createOrderCard(o, false)).join('');
    
    UI.setHTML('#cashier-orders', html);
    UI.setText('#cashier-count', this.state.orders.length);
  },

  /**
   * Render barista orders
   */
  renderBaristaOrders() {
    const pending = this.state.orders.filter(o => o.status === 'pending');

    if (pending.length === 0) {
      UI.show('#barista-empty');
      UI.setHTML('#barista-orders', '');
      UI.setText('#barista-count', '0');
    } else {
      UI.hide('#barista-empty');
      const html = pending.map(o => UI.createOrderCard(o, true)).join('');
      UI.setHTML('#barista-orders', html);
      UI.setText('#barista-count', pending.length);
    }
  },

  /**
   * Render manager dashboard
   */
  renderManagerDashboard() {
    // Stats
    const total = this.state.orders.length;
    const completed = this.state.orders.filter(o => o.status === 'completed');

    // Average time
    let avgMs = 0;
    if (completed.length) {
      avgMs = completed.reduce((sum, o) => {
        return sum + (o.completedAt - o.timestamp);
      }, 0) / completed.length;
    }

    const avgTime = avgMs > 0 ? UI.formatDuration(avgMs) : '--:--';

    // Efficiency
    const efficiency = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Team count (including network peers)
    const teamCount = this.state.team.length + P2P.getPeerCount();

    // Update stats
    UI.setText('#stat-orders', total);
    UI.setText('#stat-time', avgTime);
    UI.setText('#stat-team', teamCount);
    UI.setText('#stat-efficiency', efficiency + '%');

    // Team grid
    const teamHtml = this.state.team.map(m => UI.createTeamCard(m)).join('');
    UI.setHTML('#team-grid', teamHtml);

    // All orders
    const recent = this.state.orders.slice(0, 20);
    const ordersHtml = recent.map(o => UI.createOrderCard(o, false)).join('');
    UI.setHTML('#manager-orders', ordersHtml);
  },

  /**
   * Update connection status
   */
  updateConnectionStatus(connected) {
    this.state.isOnline = connected;

    const statusEl = UI.$('#connection-status');
    const dotEl = UI.$('#status-dot');
    const textEl = UI.$('#status-text');

    if (connected) {
      statusEl?.classList.add('connected');
      statusEl?.classList.remove('disconnected');
      UI.setText('#status-text', 'מחובר');
    } else {
      statusEl?.classList.remove('connected');
      statusEl?.classList.add('disconnected');
      UI.setText('#status-text', 'לא מחובר');
    }
  },

  /**
   * Refresh data
   */
  refresh() {
    console.log('[App] Refreshing...');
    
    // Reload data
    this.loadData();
    
    // Re-render
    this.render();
    
    // Re-announce
    P2P.announce();
    
    UI.toast('רענון הושלם', 'success', 2000);
  },

  /**
   * Show info
   */
  showInfo() {
    const peers = P2P.getPeerCount();
    const deviceInfo = P2P.getDeviceInfo();

    const info = `
CoffeeTeam Pro v1.0.0
━━━━━━━━━━━━━━━━━━━━
👤 ${this.state.name}
${this.roles[this.state.role].emoji} ${this.roles[this.state.role].name}
━━━━━━━━━━━━━━━━━━━━
☕ הזמנות: ${this.state.orders.length}
👥 צוות: ${this.state.team.length}
🌐 מכשירים מחוברים: ${peers}
${this.state.isOnline ? '✅ מחובר' : '❌ לא מחובר'}
━━━━━━━━━━━━━━━━━━━━
🔧 Device ID: ${deviceInfo.deviceId.substr(0, 20)}...
━━━━━━━━━━━━━━━━━━━━
🎯 הפסנתריה x לייב קוד
    `.trim();

    alert(info);
  },

  /**
   * Clear history (manager only)
   */
  clearHistory() {
    if (this.state.role !== 'manager') {
      return;
    }

    if (!UI.confirm('האם למחוק את כל ההיסטוריה?')) {
      return;
    }

    this.state.orders = [];
    Storage.clearOrders();
    this.render();
    
    UI.toast('ההיסטוריה נמחקה', 'success');
  },

  /**
   * Logout
   */
  logout() {
    if (!UI.confirm('בטוח שברצונך להתנתק?')) {
      return;
    }

    console.log('[App] Logging out...');

    // Stop voice if active
    if (Voice.isListening) {
      Voice.stop();
    }

    // Disconnect P2P
    P2P.disconnect();

    // Clear user (keep orders and team for other sessions)
    Storage.clearUser();
    Storage.clearSession();

    // Reload page
    location.reload();
  },

  /**
   * Show modal
   */
  showModal(selector) {
    UI.removeClass(selector, 'hidden');
  },

  /**
   * Close modal
   */
  closeModal(selector) {
    UI.addClass(selector, 'hidden');
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Export for global access
window.App = App;

console.log('[App] Module loaded');