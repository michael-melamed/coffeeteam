const App = {
  state: {
    role: null,
    name: null,
    orders: [],
    team: [],
    history: [],
    counter: 1,
    isConnected: false,
    settings: Storage.getSettings()
  },

  config: {
    MANAGER_PASSWORD: '1234',
    SHARED_SECRET: 'coffee123'
  },

  init() {
    this.loadState();
    this.registerSW();
    this.handlePWAInstall();
    UI.$('#settings-btn').addEventListener('click', () => this.openSettings());
    document.addEventListener('click', (e) => this.handleClicks(e));
    Voice.init();
    P2P.onMessage = (data) => this.handleIncomingMessage(data);
    P2P.onPeerJoin = (peerId) => this.addTeamMember({ id: peerId, connected: true });
    Storage.saveSettings(this.state.settings); // Persist menu
  },

  loadState() {
    this.state.orders = Storage.getOrders();
    this.state.team = Storage.getTeam();
    this.state.history = Storage.getHistory();
    this.state.counter = Storage.get('counter') || 1;
  },

  saveState() {
    Storage.saveOrders(this.state.orders);
    Storage.saveTeam(this.state.team);
    Storage.saveHistory(this.state.history);
    Storage.set('counter', this.state.counter);
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered')).catch(err => console.error('SW error', err));
    }
  },

  handlePWAInstall() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      UI.show('#install-prompt');
    });
    UI.$('#install-btn').addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => UI.hide('#install-prompt'));
    });
  },

  handleClicks(e) {
    if (e.target.dataset.role) this.selectRole(e.target.dataset.role);
    if (e.target.id === 'auth-btn') this.authenticate();
    if (e.target.id === 'name-btn') this.setName();
    if (e.target.id === 'mic-btn') this.toggleMic();
    if (e.target.id === 'send-order-btn') this.sendOrder();
    if (e.target.id === 'logout-btn') this.logout();
    if (e.target.id === 'export-csv') this.exportCSV();
    if (e.target.classList.contains('accept-btn')) this.acceptOrder(e.target.dataset.id);
  },

  selectRole(role) {
    this.state.role = role;
    UI.hide('#welcome');
    if (role === 'manager') {
      UI.show('#auth-modal');
    } else {
      UI.show('#name-modal');
    }
  },

  authenticate() {
    const pwd = UI.$('#password-input').value;
    if (pwd === this.config.MANAGER_PASSWORD) {
      UI.hide('#auth-modal');
      UI.show('#name-modal');
    } else {
      UI.toast('סיסמה שגויה', 'error');
    }
  },

  setName() {
    const name = UI.$('#name-input').value.trim();
    if (!name) return UI.toast('הקלדו שם', 'error');
    this.state.name = name;
    Storage.saveUser({ name, role: this.state.role });
    UI.setText('#user-name', name);
    UI.setText('#role-badge', this.state.role === 'cashier' ? 'קופאי' : this.state.role === 'barista' ? 'בריסטה' : 'מנהל');
    UI.hide('#name-modal');
    this.startApp();
  },

  startApp() {
    UI.show('#app');
    UI.hide('#welcome');
    P2P.init(this.state.role);
    switch (this.state.role) {
      case 'cashier': this.initCashier(); break;
      case 'barista': this.initBarista(); break;
      case 'manager': this.initManager(); break;
    }
    this.renderOrders();
    this.renderTeam();
  },

  initCashier() {
    Voice.onResult = (text) => {
      const parsed = Voice.parse(text);
      if (parsed) {
        const display = Voice.formatParsed(parsed);
        UI.setHTML('#parsed-order', `<p>${display}</p><small>דיוק: ${parsed.confidence}%</small>`);
        UI.show('#parsed-order');
        UI.show('#send-order-btn');
        UI.enable('#send-order-btn');
        App.state.currentOrder = parsed;
      } else {
        UI.toast('לא זוהה - נסו ידנית', 'error');
      }
    };
    Voice.onError = (err) => UI.toast(`שגיאה: ${err}`, 'error');

    // Manual input fallback
    UI.$('#manual-input').addEventListener('input', (e) => {
      if (e.target.value) {
        App.state.currentOrder = { text: e.target.value, confidence: 100 };
        UI.setHTML('#parsed-order', `<p>${e.target.value}</p>`);
        UI.show('#parsed-order', '#send-order-btn');
        UI.enable('#send-order-btn');
      }
    });
  },

  toggleMic() {
    if (Voice.isListening) {
      Voice.stop();
      UI.setText('#mic-btn', '🎤');
    } else {
      Voice.start();
      UI.setText('#mic-btn', '⏹️');
    }
  },

  sendOrder() {
    if (!App.state.currentOrder) return;
    const order = {
      id: this.state.counter++,
      text: App.state.currentOrder.text,
      user: this.state.name,
      time: new Date().toLocaleTimeString('he-IL'),
      new: true,
      done: false,
      timestamp: Date.now()
    };
    this.state.orders.unshift(order);
    this.state.history.unshift(order);
    P2P.send({ type: 'order', order });
    UI.playSound('order-sent');
    UI.toast('הזמנה נשלחה!', 'success');
    UI.hide('#parsed-order', '#send-order-btn');
    UI.$('#manual-input').value = '';
    this.renderOrders();
    this.saveState();
  },

  initBarista() {
    // Auto-notify on new orders
    P2P.onMessage = (data) => {
      if (data.type === 'order') {
        this.state.orders.unshift(data.order);
        UI.notify('הזמנה חדשה!', data.order.text);
        this.renderOrders();
        this.saveState();
      }
    };
  },

  acceptOrder(id) {
    const order = this.state.orders.find(o => o.id == id);
    if (order) {
      order.done = true;
      order.new = false;
      order.completeTime = Date.now();
      P2P.send({ type: 'update', order });
      UI.playSound('order-complete');
      this.renderOrders();
      this.updateStats();
      this.saveState();
    }
  },

  initManager() {
    this.renderStats();
    P2P.onMessage = (data) => {
      if (data.type === 'order' || data.type === 'update') {
        if (data.type === 'order') this.state.orders.unshift(data.order);
        else {
          const idx = this.state.orders.findIndex(o => o.id === data.order.id);
          if (idx > -1) this.state.orders[idx] = data.order;
        }
        this.state.history.unshift(data.order || this.state.orders[0]);
        this.renderOrders();
        this.updateStats();
        this.saveState();
      } else if (data.type === 'beacon') {
        this.addTeamMember({ id: data.id, name: 'לא ידוע', role: data.role, connected: true });
      }
    };
  },

  addTeamMember(member) {
    const existing = this.state.team.find(t => t.id === member.id);
    if (!existing) {
      this.state.team.push(member);
    } else {
      existing.connected = true;
    }
    this.renderTeam();
    this.updateStats();
    Storage.saveTeam(this.state.team);
  },

  renderOrders() {
    const container = UI.$(this.state.role === 'barista' ? '#order-queue' : this.state.role === 'manager' ? '#order-history' : '#recent-orders');
    if (!container) return;
    container.innerHTML = `<h3>${this.state.role === 'barista' ? 'תור הזמנות' : this.state.role === 'manager' ? 'היסטוריה מלאה' : 'הזמנות אחרונות'}</h3>`;
    this.state.orders.slice(0, 10).forEach(order => {
      const showBtn = this.state.role === 'barista' && !order.done;
      container.innerHTML += UI.createOrderCard(order, showBtn);
    });
  },

  renderTeam() {
    const container = UI.$('#team-list');
    if (!container) return;
    container.innerHTML = '<h3>צוות</h3>';
    this.state.team.forEach(member => {
      container.innerHTML += UI.createTeamCard(member);
    });
  },

  renderStats() {
    document.getElementById('today-orders').textContent = this.state.history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length;
    // Avg time calc
    const completed = this.state.history.filter(h => h.completeTime);
    const avg = completed.length ? Math.round(completed.reduce((sum, o) => sum + (o.completeTime - o.timestamp), 0) / completed.length / 60000) : 0;
    document.getElementById('avg-time').textContent = `${avg} דק'`;
    document.getElementById('connected-team').textContent = this.state.team.filter(t => t.connected).length;
    document.getElementById('efficiency').textContent = completed.length ? `${Math.round((completed.length / this.state.history.length) * 100)}%` : '100%';
  },

  updateStats() {
    if (this.state.role === 'manager') this.renderStats();
  },

  handleIncomingMessage(data) {
    if (data.type === 'order') {
      this.state.orders.unshift(data.order);
      UI.notify('הזמנה חדשה!', data.order.text);
      this.renderOrders();
      this.saveState();
    } else if (data.type === 'update') {
      const idx = this.state.orders.findIndex(o => o.id === data.order.id);
      if (idx > -1) this.state.orders[idx] = data.order;
      this.renderOrders();
      this.saveState();
    }
  },

  openSettings() {
    const newMenu = UI.prompt('ערכו תפריט (JSON):', JSON.stringify(this.state.settings.menu, null, 2));
    if (newMenu) {
      try {
        this.state.settings.menu = JSON.parse(newMenu);
        Storage.saveSettings(this.state.settings);
        UI.toast('הגדרות נשמרו', 'success');
      } catch (e) {
        UI.toast('שגיאה בעריכה', 'error');
      }
    }
  },

  exportCSV() {
    const csv = 'ID,טקסט,משתמש,זמן,סטטוס\n' + this.state.history.map(o => `${o.id},"${o.text}",${o.user},${o.time},${o.done ? 'הושלם' : 'פעיל'}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  logout() {
    P2P.disconnect();
    Storage.clear();
    location.reload();
  }
};

// Auto-init
App.init();