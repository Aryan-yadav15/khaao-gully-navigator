/**
 * WebSocket Service for Real-Time Driver Tracking
 * Handles connection, location updates, and order events
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOST } from '@env';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
    this.pingInterval = null;
    this.locationUpdateInterval = null;
    this.isConnecting = false;
    this.eventListeners = {
      order_assigned: [],
      order_cancelled: [],
      order_unassigned: [],
      connection_status: [],
      error: []
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(driverId) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('Already connected or connecting');
      return;
    }

    try {
      this.isConnecting = true;
      const token = await AsyncStorage.getItem('driver_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get WebSocket URL from environment or derive from Host
      // If API_HOST is http://..., replace with ws://...
      let WS_BASE_URL = process.env.WS_BASE_URL;
      if (!WS_BASE_URL && API_HOST) {
        WS_BASE_URL = API_HOST.replace('http', 'ws');
      }
      WS_BASE_URL = WS_BASE_URL || 'ws://localhost:8000';

      const url = `${WS_BASE_URL}/api/v1/ws/driver/${driverId}?token=${token}`;

      console.log('Connecting to WebSocket:', url.replace(token, 'TOKEN_HIDDEN'));
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.notifyListeners('error', { message: error.message });
      this.scheduleReconnect(driverId);
    }
  }

  /**
   * Handle connection open
   */
  handleOpen() {
    console.log('✅ WebSocket connected successfully');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyListeners('connection_status', { connected: true });
    
    // Start ping/pong heartbeat
    this.startPingInterval();
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 Received message:', message.type);

      switch (message.type) {
        case 'pong':
          // Connection is healthy
          break;

        case 'order_assigned':
          this.notifyListeners('order_assigned', message.data);
          break;

        case 'order_cancelled':
          this.notifyListeners('order_cancelled', message.data);
          break;

        case 'order_unassigned':
          this.notifyListeners('order_unassigned', message.data);
          break;

        case 'connection_ack':
          console.log('Connection acknowledged by server');
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Handle connection errors
   */
  handleError(error) {
    console.error('❌ WebSocket error:', error);
    this.notifyListeners('error', { message: 'Connection error occurred' });
  }

  /**
   * Handle connection close
   */
  async handleClose(event) {
    console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
    this.isConnecting = false;
    this.notifyListeners('connection_status', { connected: false });
    
    // Clear intervals
    this.stopPingInterval();
    this.stopLocationUpdates();

    // Handle specific close codes
    switch (event.code) {
      case 4001:
        // Authentication failed - try refreshing token
        console.log('Authentication failed. Attempting token refresh...');
        await this.refreshTokenAndReconnect();
        break;

      case 4003:
        // Duplicate connection
        this.notifyListeners('error', { 
          message: 'You are logged in from another device',
          code: 'DUPLICATE_CONNECTION'
        });
        break;

      default:
        // Normal disconnect - attempt reconnect
        const driverDataStr = await AsyncStorage.getItem('driver_data');
        if (driverDataStr) {
          const driverData = JSON.parse(driverDataStr);
          if (driverData && driverData.id) {
            this.scheduleReconnect(driverData.id);
          }
        }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect(driverId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyListeners('error', { 
        message: 'Unable to connect to server. Please check your internet connection.',
        code: 'MAX_RECONNECT_ATTEMPTS'
      });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay/1000}s... (Attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(driverId);
    }, delay);
  }

  /**
   * Refresh token and reconnect
   */
  async refreshTokenAndReconnect() {
    try {
      // TODO: Implement refresh token logic if backend supports it
      // For now, we might need to logout if token is invalid
      console.log('Token refresh requested but not fully implemented');
      
      /* 
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      */

      this.notifyListeners('error', { 
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      this.notifyListeners('error', { 
        message: 'Authentication error. Please login again.',
        code: 'TOKEN_REFRESH_ERROR'
      });
    }
  }

  /**
   * Send location update to server
   */
  sendLocation(locationData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected. Cannot send location.');
      return false;
    }

    // Map frontend location object to backend expectation
    // Backend expects: lat, lng, status, order_id
    const payload = {
      type: 'location_update',
      data: {
        lat: locationData.lat || locationData.latitude,
        lng: locationData.lng || locationData.longitude,
        status: locationData.status || 'ONLINE',
        order_id: locationData.order_id || null,
        
        // Extra metadata (optional but good for debugging)
        accuracy: locationData.accuracy || 0,
        heading: locationData.heading || 0,
        speed: locationData.speed || 0,
        battery_level: locationData.battery_level || 100,
        timestamp: new Date().toISOString()
      }
    };

    try {
      this.ws.send(JSON.stringify(payload));
      // Reduced logging - only log occasionally
      if (Math.random() < 0.2) { // 20% of the time
        console.log('📍 Location sent:', payload.data.lat, payload.data.lng);
      }
      return true;
    } catch (error) {
      console.error('Error sending location:', error);
      return false;
    }
  }

  /**
   * Start sending location updates every 10 seconds
   */
  startLocationUpdates(getLocationCallback) {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
    }

    this.locationUpdateInterval = setInterval(async () => {
      try {
        const location = await getLocationCallback();
        if (location) {
          this.sendLocation(location);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }, 10000); // 10 seconds

    console.log('✅ Location updates started (every 10s)');
  }

  /**
   * Stop location updates
   */
  stopLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      console.log('🛑 Location updates stopped');
    }
  }

  /**
   * Start ping/pong heartbeat
   */
  startPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Notify all listeners for an event
   */
  notifyListeners(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    console.log('Disconnecting WebSocket...');
    
    // Clear all intervals and timeouts
    this.stopPingInterval();
    this.stopLocationUpdates();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Driver went offline');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export default new WebSocketService();
