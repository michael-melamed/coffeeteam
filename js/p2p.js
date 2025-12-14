/**
 * CoffeeTeam Pro - P2P Communication
 * Real peer-to-peer communication using BroadcastChannel + localStorage events
 * Works across multiple browser tabs/windows on same device
 * For multi-device: Would need WebRTC signaling server
 */

const P2P = {
  channel: null,
  deviceId: null,
  isConnected: false,
  peers: new Map(),
  
  // Callbacks
  onMessage: null,
  onPeerJoin: null,
  onPeerLeave: null,
  onConnectionChange: null,

  /**
   * Initialize P2P communication
   */
  init() {
    this.deviceId = this.getDeviceId();
    
    console.log('[P2P] Initializing...', this.deviceId);

    // Use BroadcastChannel for same-device communication
    if ('BroadcastChannel' in window) {
      this.initBroadcastChannel();
    } else {
      // Fallback to localStorage events
      this.initStorageChannel();
    }

    // Announce presence
    this.announce();
    
    // Setup heartbeat
    this.startHeartbeat();
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => this.disconnect());

    this.setConnected(true);
    console.log('[P2P] Initialized');
    
    return true;
  },

  /**
   * Initialize BroadcastChannel (modern browsers)
   */
  initBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel('coffeeteam');
      
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.channel.onerror = (error) => {
        console.error('[P2P] Channel error:', error);
      };

      console.log('[P2P] BroadcastChannel initialized');
    } catch (error) {
      console.error('[P2P] BroadcastChannel failed:', error);
      this.initStorageChannel();
    }
  },

  /**
   * Initialize localStorage fallback (older browsers)
   */
  initStorageChannel() {
    console.log('[P2P] Using localStorage fallback');
    
    window.addEventListener('storage', (event) => {
      if (event.key === 'coffeeteam_broadcast') {
        try {
          const message = JSON.parse(event.newValue);
          if (message.from !== this.deviceId) {
            this.handleMessage(message);
          }
        } catch (error) {
          console.error('[P2P] Storage parse error:', error);
        }
      }
    });
  },

  /**
   * Send message to all peers
   */
  send(type, data) {
    const message = {
      type,
      data,
      from: this.deviceId,
      timestamp: Date.now()
    };

    try {
      if (this.channel) {
        // BroadcastChannel
        this.channel.postMessage(message);
      } else {
        // localStorage fallback
        localStorage.setItem('coffeeteam_broadcast', JSON.stringify(message));
        // Clear immediately to allow repeated messages
        setTimeout(() => {
          localStorage.removeItem('coffeeteam_broadcast');
        }, 100);
      }
      
      console.log('[P2P] Message sent:', type);
      return true;
    } catch (error) {
      console.error('[P2P] Send failed:', error);
      return false;
    }
  },

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    if (!message || message.from === this.deviceId) {
      return;
    }

    console.log('[P2P] Message received:', message.type, 'from', message.from);

    switch (message.type) {
      case 'announce':
        this.handleAnnounce(message);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
        
      case 'goodbye':
        this.handleGoodbye(message);
        break;
        
      case 'order':
      case 'order_update':
      case 'team_update':
        if (this.onMessage) {
          this.onMessage(message);
        }
        break;
        
      default:
        console.log('[P2P] Unknown message type:', message.type);
    }
  },

  /**
   * Handle peer announcement
   */
  handleAnnounce(message) {
    const peer = message.data;
    
    if (!this.peers.has(peer.deviceId)) {
      this.peers.set(peer.deviceId, {
        ...peer,
        lastSeen: Date.now()
      });
      
      console.log('[P2P] Peer joined:', peer.name, peer.role);
      
      if (this.onPeerJoin) {
        this.onPeerJoin(peer);
      }

      // Send our info back
      this.announce();
    }
  },

  /**
   * Handle heartbeat from peer
   */
  handleHeartbeat(message) {
    const peerId = message.from;
    const peer = this.peers.get(peerId);
    
    if (peer) {
      peer.lastSeen = Date.now();
      this.peers.set(peerId, peer);
    }
  },

  /**
   * Handle peer goodbye
   */
  handleGoodbye(message) {
    const peerId = message.from;
    const peer = this.peers.get(peerId);
    
    if (peer) {
      this.peers.delete(peerId);
      console.log('[P2P] Peer left:', peer.name);
      
      if (this.onPeerLeave) {
        this.onPeerLeave(peer);
      }
    }
  },

  /**
   * Announce our presence
   */
  announce() {
    const user = Storage.getUser();
    
    if (!user) return;

    this.send('announce', {
      deviceId: this.deviceId,
      name: user.name,
      role: user.role,
      timestamp: Date.now()
    });
  },

  /**
   * Start heartbeat to keep peers updated
   */
  startHeartbeat() {
    // Send heartbeat every 5 seconds
    setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', {
          deviceId: this.deviceId,
          timestamp: Date.now()
        });
        
        // Check for dead peers (no heartbeat in 15 seconds)
        this.checkPeers();
      }
    }, 5000);
  },

  /**
   * Check for inactive peers
   */
  checkPeers() {
    const now = Date.now();
    const timeout = 15000; // 15 seconds

    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > timeout) {
        console.log('[P2P] Peer timeout:', peer.name);
        this.peers.delete(peerId);
        
        if (this.onPeerLeave) {
          this.onPeerLeave(peer);
        }
      }
    }
  },

  /**
   * Broadcast new order
   */
  broadcastOrder(order) {
    return this.send('order', order);
  },

  /**
   * Broadcast order update
   */
  broadcastOrderUpdate(order) {
    return this.send('order_update', order);
  },

  /**
   * Broadcast team update
   */
  broadcastTeamUpdate(team) {
    return this.send('team_update', team);
  },

  /**
   * Get all connected peers
   */
  getPeers() {
    return Array.from(this.peers.values());
  },

  /**
   * Get peer count
   */
  getPeerCount() {
    return this.peers.size;
  },

  /**
   * Check if connected
   */
  isOnline() {
    return this.isConnected && navigator.onLine;
  },

  /**
   * Set connection status
   */
  setConnected(connected) {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      console.log('[P2P] Connection status:', connected ? 'online' : 'offline');
      
      if (this.onConnectionChange) {
        this.onConnectionChange(connected);
      }
    }
  },

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('[P2P] Disconnecting...');
    
    // Send goodbye
    this.send('goodbye', {
      deviceId: this.deviceId,
      timestamp: Date.now()
    });

    // Close channel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    // Clear peers
    this.peers.clear();
    
    this.setConnected(false);
    console.log('[P2P] Disconnected');
  },

  /**
   * Get or create device ID
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('coffeeteam_device_id');
    
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('coffeeteam_device_id', deviceId);
    }
    
    return deviceId;
  },

  /**
   * Get device info
   */
  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine,
      peers: this.getPeerCount()
    };
  }
};

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('[P2P] Network online');
  P2P.setConnected(true);
  P2P.announce();
});

window.addEventListener('offline', () => {
  console.log('[P2P] Network offline');
  P2P.setConnected(false);
});

console.log('[P2P] Module loaded');