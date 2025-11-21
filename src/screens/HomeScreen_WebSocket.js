import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  RefreshControl,
  Alert 
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignedOrders, getCurrentDriver } from '../api/fleetbase';
import websocketService from '../services/websocket';

export default function HomeScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Mock data for demo (replace with API calls later)
  const [stats, setStats] = useState({
    todayEarnings: 450,
    weekEarnings: 3200,
    monthEarnings: 12500,
    todayDeliveries: 12,
    weekDeliveries: 45,
    monthDeliveries: 180,
    todayDistance: 45.2,
  });

  useEffect(() => {
    loadDashboard();
    setupWebSocketListeners();

    return () => {
      cleanupWebSocketListeners();
    };
  }, []);

  const setupWebSocketListeners = () => {
    websocketService.on('connection_status', handleConnectionStatus);
    websocketService.on('order_assigned', handleNewOrder);
    websocketService.on('order_cancelled', handleOrderCancelled);
    websocketService.on('error', handleWebSocketError);
  };

  const cleanupWebSocketListeners = () => {
    websocketService.off('connection_status', handleConnectionStatus);
    websocketService.off('order_assigned', handleNewOrder);
    websocketService.off('order_cancelled', handleOrderCancelled);
    websocketService.off('error', handleWebSocketError);
  };

  const handleConnectionStatus = ({ connected }) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
    console.log('Connection status:', connected ? '✅ Connected' : '❌ Disconnected');
  };

  const handleNewOrder = (orderData) => {
    console.log('📦 New order received:', orderData);
    
    // Play notification sound (optional - requires expo-av)
    // playNotificationSound();

    Alert.alert(
      '🎉 New Order Assigned!',
      `Order #${orderData.order_id}\n\n` +
      `📍 Pickup: ${orderData.pickup_address}\n` +
      `🏠 Delivery: ${orderData.delivery_address}\n` +
      `💰 Earnings: ₹${orderData.earnings}\n` +
      `📏 Distance: ${orderData.distance_km} km`,
      [
        { 
          text: 'View Details', 
          onPress: () => {
            navigation.navigate('DeliveryList');
            loadDashboard(); // Refresh to show new order
          }
        },
        { text: 'Dismiss', style: 'cancel' }
      ],
      { cancelable: false }
    );
  };

  const handleOrderCancelled = ({ order_id, reason }) => {
    console.log('❌ Order cancelled:', order_id);
    
    Alert.alert(
      'Order Cancelled',
      `Order #${order_id}\nReason: ${reason}`,
      [{ text: 'OK', onPress: loadDashboard }]
    );
  };

  const handleWebSocketError = ({ message, code }) => {
    console.error('WebSocket error:', code, message);

    if (code === 'DUPLICATE_CONNECTION') {
      Alert.alert(
        'Logged In Elsewhere',
        'Your account is being used on another device. You have been logged out.',
        [
          { 
            text: 'OK', 
            onPress: async () => {
              await AsyncStorage.clear();
              navigation.replace('Login');
            }
          }
        ],
        { cancelable: false }
      );
    } else if (code === 'MAX_RECONNECT_ATTEMPTS') {
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection and try going online again.',
        [{ text: 'OK' }]
      );
      setIsOnline(false);
    } else if (code === 'TOKEN_REFRESH_FAILED') {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          { 
            text: 'Login', 
            onPress: async () => {
              await AsyncStorage.clear();
              navigation.replace('Login');
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  const loadDashboard = async () => {
    setRefreshing(true);
    try {
      const driverData = await getCurrentDriver();
      setDriver(driverData);
      
      // Check for active orders
      const orders = await getAssignedOrders('in_progress');
      if (orders && orders.length > 0) {
        setActiveOrder(orders[0]);
      } else {
        setActiveOrder(null);
      }
      
      // TODO: Fetch real earnings data when API ready
      // const earnings = await getDailyEarnings();
      // setStats(earnings);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    if (!isOnline) {
      // Going ONLINE
      try {
        // 1. Request location permission
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          return;
        }

        // 2. Get driver ID
        const driverId = await AsyncStorage.getItem('driverId');
        if (!driverId) {
          Alert.alert('Error', 'Driver ID not found. Please login again.');
          return;
        }

        // 3. Connect WebSocket
        await websocketService.connect(driverId);

        // 4. Start sending location updates
        websocketService.startLocationUpdates(getCurrentLocation);

        setIsOnline(true);
        console.log('✅ Driver is now ONLINE');

        // TODO: Update driver status in API
        // await updateDriverStatus(driverId, 'online');

      } catch (error) {
        console.error('Error going online:', error);
        Alert.alert('Error', 'Failed to go online. Please try again.');
      }
    } else {
      // Going OFFLINE
      try {
        websocketService.disconnect();
        setIsOnline(false);
        setConnectionStatus('disconnected');
        console.log('🔴 Driver is now OFFLINE');

        // TODO: Update driver status in API
        // const driverId = await AsyncStorage.getItem('driverId');
        // await updateDriverStatus(driverId, 'offline');

      } catch (error) {
        console.error('Error going offline:', error);
      }
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to go online and receive orders.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request background permission (for iOS/Android)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Recommended',
          'For the best experience, please enable "Always Allow" location access so we can track your location even when the app is in the background.',
          [{ text: 'OK' }]
        );
      }

      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get battery level (optional - requires expo-battery)
      // const battery = await getBatteryLevel();

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        heading: location.coords.heading || 0,
        speed: location.coords.speed || 0,
        battery_level: 100, // Default if not using expo-battery
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const getConnectionStatusColor = () => {
    if (!isOnline) return '#999';
    return connectionStatus === 'connected' ? '#4CAF50' : '#FF9800';
  };

  const getConnectionStatusText = () => {
    if (!isOnline) return '🔴 Offline';
    return connectionStatus === 'connected' ? '🟢 Online & Connected' : '🟡 Connecting...';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
      }
    >
      {/* Header with Online/Offline Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driver?.name || 'Driver'}!</Text>
          <Text style={[styles.subtitle, { color: getConnectionStatusColor() }]}>
            {getConnectionStatusText()}
          </Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Active Order Status */}
      {activeOrder && (
        <TouchableOpacity 
          style={styles.activeOrderCard}
          onPress={() => navigation.navigate('DeliveryList')}
        >
          <View style={styles.activeOrderHeader}>
            <Text style={styles.activeOrderTitle}>🚚 Active Delivery</Text>
            <Text style={styles.activeOrderStatus}>{activeOrder.status}</Text>
          </View>
          <Text style={styles.activeOrderText}>Order #{activeOrder.public_id}</Text>
          <Text style={styles.activeOrderText}>{activeOrder.dropoff_address}</Text>
          <Text style={styles.viewDetailsText}>Tap to view details →</Text>
        </TouchableOpacity>
      )}

      {/* Today's Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Today's Earnings</Text>
        <Text style={styles.earningsAmount}>₹{stats.todayEarnings.toFixed(2)}</Text>
        <View style={styles.earningsStats}>
          <View style={styles.earningStat}>
            <Text style={styles.statNumber}>{stats.todayDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.earningStat}>
            <Text style={styles.statNumber}>{stats.todayDistance.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
      </View>

      {/* Weekly & Monthly Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryAmount}>₹{stats.weekEarnings}</Text>
          <Text style={styles.summaryDetail}>{stats.weekDeliveries} deliveries</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryAmount}>₹{stats.monthEarnings}</Text>
          <Text style={styles.summaryDetail}>{stats.monthDeliveries} deliveries</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => navigation.navigate('PooledOrders')}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>View Pooled Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <Text style={styles.actionIcon}>📜</Text>
          <Text style={styles.actionText}>Order History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Earnings')}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>View Earnings Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionText}>Profile & Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Pool Assignments (if any) */}
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>Pending Assignments</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {isOnline 
              ? connectionStatus === 'connected'
                ? 'No pending assignments. You\'ll be notified when new orders arrive.'
                : 'Connecting to server...'
              : 'Go online to receive order assignments.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activeOrderCard: {
    backgroundColor: '#FFF3CD',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activeOrderStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activeOrderText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  earningsCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  earningsLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  earningsAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 10,
  },
  earningsStats: {
    flexDirection: 'row',
    marginTop: 10,
  },
  earningStat: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 11,
    color: '#999',
  },
  actionsSection: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryAction: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pendingSection: {
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
