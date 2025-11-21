import * as Location from 'expo-location';
import WebSocketService from './websocket';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationTracker {
  constructor() {
    this.subscription = null;
    this.isTracking = false;
    this.lastLocation = null;
    this.currentOrderId = null;
    this.lastUpdateTime = null;
    this.watchdogInterval = null;
    
    // Listen for connection restoration to resend last location
    WebSocketService.on('connection_status', (status) => {
      if (status.connected && this.lastLocation) {
        console.log('🔄 Connection restored, resending last location...');
        this.resendLastLocation();
      }
    });
  }

  async resendLastLocation() {
    if (!this.lastLocation) return;
    const driverStatus = await AsyncStorage.getItem('driver_status') || 'ONLINE';
    WebSocketService.sendLocation({
      ...this.lastLocation,
      status: driverStatus,
      order_id: this.currentOrderId
    });
  }

  /**
   * Request permissions and start tracking
   */
  async startTracking() {
    // Prevent duplicate tracking subscriptions
    if (this.isTracking) {
      console.log('📍 Location tracking already active, skipping duplicate start');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({});
      this.handleLocationUpdate(location);

      // Start watching position
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 0, // Fire on every interval, even if stationary (important for simulators)
        },
        (location) => this.handleLocationUpdate(location)
      );

      this.isTracking = true;
      this.lastUpdateTime = Date.now();
      console.log('📍 Location tracking started');
      
      // Start watchdog to ensure tracking stays active
      this.startWatchdog();
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      console.log('🛑 Location tracking already stopped');
      return;
    }
    
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.stopWatchdog();
    this.isTracking = false;
    this.lastUpdateTime = null;
    console.log('🛑 Location tracking stopped');
  }

  /**
   * Handle new location update
   */
  async handleLocationUpdate(location) {
    // Reduced logging - only log every 5th update to avoid spam
    if (!this.updateCount) this.updateCount = 0;
    this.updateCount++;
    if (this.updateCount % 5 === 0) {
      console.log(`📍 Location update #${this.updateCount}: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
    }
    
    this.lastUpdateTime = Date.now();
    
    const { latitude, longitude, speed, heading, accuracy } = location.coords;
    
    this.lastLocation = {
      lat: latitude,
      lng: longitude,
      speed: speed * 3.6, // Convert m/s to km/h
      heading,
      accuracy,
      timestamp: location.timestamp
    };

    // Get driver status from storage (optional, or pass it in)
    const driverStatus = await AsyncStorage.getItem('driver_status') || 'ONLINE';

    // Send to WebSocket
    WebSocketService.sendLocation({
      ...this.lastLocation,
      status: driverStatus,
      order_id: this.currentOrderId
    });
  }

  setCurrentOrder(orderId) {
    this.currentOrderId = orderId;
  }

  startWatchdog() {
    if (this.watchdogInterval) return;
    
    // Check every 20 seconds if we're receiving location updates
    this.watchdogInterval = setInterval(() => {
      if (!this.isTracking) {
        this.stopWatchdog();
        return;
      }

      const timeSinceLastUpdate = Date.now() - (this.lastUpdateTime || 0);
      const STALE_THRESHOLD = 45000; // 45 seconds (3x the update interval)

      if (timeSinceLastUpdate > STALE_THRESHOLD) {
        console.warn('⚠️ Location updates stalled! Attempting restart...');
        this.restartTracking();
      }
      // Removed verbose health check logs
    }, 20000);
  }

  stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  async restartTracking() {
    console.log('🔄 Restarting location tracking...');
    this.stopTracking();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.startTracking();
  }
}

export default new LocationTracker();
