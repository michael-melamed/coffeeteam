// Native WebRTC - Manual SDP via QR for local network (no signaling server)
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }; // Free STUN for NAT

const P2P = {
  pc: null,
  channel: null,
  localId: Math.random().toString(36).substr(2, 9),
  peers: new Map(),
  sharedSecret: 'coffee123', // Basic auth - שנה למשהו חזק יותר בפרודקשן

  onMessage: () => {},
  onPeerJoin: () => {},
  onPeerLeave: () => {},

  init(role) {
    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (event) => {
      // ICE candidates נשלחים אוטומטית דרך החיבור הקיים
      if (event.candidate) console.log('New ICE candidate');
    };

    this.channel = this.pc.createDataChannel('orders');
    this.channel.onopen = () => {
      UI.toast('מחובר לצוות!', 'success');
      document.getElementById('connection-status').textContent = 'מחובר';
      this.broadcastBeacon();
    };
    this.channel.onclose = () => {
      UI.toast('התנתקות - נסו להתחבר מחדש', 'error');
      document.getElementById('connection-status').textContent = 'מנותק';
      this.reconnect();
    };
    this.channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.secret !== this.sharedSecret) return; // אימות בסיסי
        this.onMessage(data);
      } catch (e) {
        console.error('שגיאת הודעה:', e);
      }
    };

    // Beacon לגילוי תקופתי
    setInterval(() => this.broadcastBeacon(), 10000);

    if (role === 'cashier') {
      this.createOffer();
    }
  },

  createOffer() {
    this.pc.createOffer()
      .then(offer => this.pc.setLocalDescription(offer))
      .then(() => {
        const qrData = btoa(JSON.stringify({
          type: 'offer',
          sdp: this.pc.localDescription.sdp,
          id: this.localId,
          secret: this.sharedSecret
        }));
        generateQR(qrData);
        UI.show('#connection-modal');
        document.getElementById('connection-text').textContent = 'סרקו את ה-QR עם מכשירי הבריסטה/מנהל';
      })
      .catch(err => UI.toast('שגיאה ביצירת Offer: ' + err.message, 'error'));
  },

  handleOffer(qrData) {
    try {
      const { sdp, id, secret } = JSON.parse(atob(qrData));
      if (secret !== this.sharedSecret) throw new Error('סוד שגוי');
      this.peers.set(id, { connected: true });

      this.pc.setRemoteDescription({ type: 'offer', sdp })
        .then(() => this.pc.createAnswer())
        .then(answer => this.pc.setLocalDescription(answer))
        .then(() => {
          const responseQr = btoa(JSON.stringify({
            type: 'answer',
            sdp: this.pc.localDescription.sdp,
            id: this.localId,
            secret: this.sharedSecret
          }));
          generateQR(responseQr);
          document.getElementById('connection-text').textContent = 'הציגו את ה-QR לקופאי לסריקה';
        });
    } catch (e) {
      UI.toast('שגיאת חיבור Offer: ' + e.message, 'error');
    }
  },

  handleAnswer(qrData) {
    try {
      const { sdp, id, secret } = JSON.parse(atob(qrData));
      if (secret !== this.sharedSecret) throw new Error('סוד שגוי');
      this.peers.set(id, { connected: true });
      this.pc.setRemoteDescription({ type: 'answer', sdp });
      this.onPeerJoin(id);
    } catch (e) {
      UI.toast('שגיאת חיבור Answer: ' + e.message, 'error');
    }
  },

  send(data) {
    if (this.channel?.readyState === 'open') {
      this.channel.send(JSON.stringify({ ...data, secret: this.sharedSecret }));
    }
  },

  broadcastBeacon() {
    this.send({ type: 'beacon', id: this.localId, role: App.state.role, name: App.state.name });
  },

  reconnect() {
    setTimeout(() => {
      if (App.state.role === 'cashier') this.createOffer();
    }, 5000);
  },

  disconnect() {
    this.channel?.close();
    this.pc?.close();
    this.peers.clear();
  }
};

export { P2P }; // אם אתה משתמש ב-modules, אחרת הסר