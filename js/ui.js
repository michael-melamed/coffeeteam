const UI = {
  $(sel) { return document.querySelector(sel); },
  $$(sel) { return document.querySelectorAll(sel); },

  show(el) { this.$(el)?.classList.remove('hidden'); },
  hide(el) { this.$(el)?.classList.add('hidden'); },
  toggle(el) { this.$(el)?.classList.toggle('hidden'); },

  setText(sel, text) { this.$(sel).textContent = text; },
  setHTML(sel, html) { this.$(sel).innerHTML = html; },
  addClass(sel, cls) { this.$(sel)?.classList.add(cls); },
  removeClass(sel, cls) { this.$(sel)?.classList.remove(cls); },

  toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  confirm(message) {
    return confirm(message);
  },

  prompt(message) {
    return prompt(message);
  },

  createOrderCard(order, showBtn = false) {
    const btnHtml = showBtn ? `<button class="accept-btn" data-id="${order.id}">קיבלתי</button>` : '';
    const status = order.done ? 'done' : (order.new ? 'new' : '');
    return `
      <div class="order-card ${status}" data-id="${order.id}">
        <p>${order.text}</p>
        <small>${order.time} | ${order.user}</small>
        ${btnHtml}
      </div>
    `;
  },

  createTeamCard(member) {
    return `
      <div class="team-member">
        <span>${member.name} - ${member.role}</span>
        <span>${member.connected ? 'מחובר' : 'מנותק'}</span>
      </div>
    `;
  },

  playSound(name) {
    // Placeholder - add audio files to assets/sounds
    const audio = new Audio(`assets/sounds/${name}.mp3`);
    audio.play().catch(() => {}); // Silent fail
  },

  notify(title, body) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/icons/icon-192.png' });
    }
  }
};

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}