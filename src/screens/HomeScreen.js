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
import { getAssignedOrders, getCurrentDriver } from '../api/client';
import websocketService from '../services/websocket';

export default function HomeScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  
  // Check if driver is verified (Mock logic - replace with actual field from API)
  const isVerified = driver?.status === 'active' || driver?.is_verified === true || true; // Defaulting to true for dev if field missing
  
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
    setupWebSocket();
    
    return () => {
      // Cleanup WebSocket on unmount
      websocketService.off('order_assigned', handleOrderAssigned);
      websocketService.off('order_cancelled', handleOrderCancelled);
      websocketService.off('connection_status', handleConnectionStatus);
      websocketService.off('error', handleWSError);
    };
  }, []);

  const setupWebSocket = async () => {
    try {
      const driverData = await getCurrentDriver();
      if (!driverData) return;

      // Connect to WebSocket
      await websocketService.connect(driverData.id);

      // Listen for order events
      websocketService.on('order_assigned', handleOrderAssigned);
      websocketService.on('order_cancelled', handleOrderCancelled);
      websocketService.on('connection_status', handleConnectionStatus);
      websocketService.on('error', handleWSError);

      console.log('✅ WebSocket setup complete');
    } catch (error) {
      console.error('❌ WebSocket setup failed:', error);
    }
  };

  const handleOrderAssigned = (data) => {
    console.log('🎯 New order assigned!', data);
    Alert.alert(
      '🚚 New Order Assigned!',
      `Order #${data.order_id || data.id} has been assigned to you.`,
      [
        { 
          text: 'View', 
          onPress: () => {
            loadDashboard();
            navigation.navigate('OrderDetail', { orderId: data.order_id || data.id });
          } 
        },
        {
          text: 'Close',
          onPress: () => loadDashboard()
        }
      ]
    );
  };

  const handleOrderCancelled = (data) => {
    console.log('❌ Order cancelled', data);
    Alert.alert('Order Cancelled', `Order #${data.order_id} has been cancelled.`);
    loadDashboard();
  };

  const handleConnectionStatus = (data) => {
    console.log('🔌 Connection status:', data.connected ? 'Connected' : 'Disconnected');
  };

  const handleWSError = (error) => {
    console.error('❌ WebSocket error:', error);
    if (error.code === 'TOKEN_EXPIRED') {
      Alert.alert('Session Expired', 'Please login again.', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    }
  };

  const loadDashboard = async () => {
    setRefreshing(true);
    try {
      const driverData = await getCurrentDriver();
      setDriver(driverData);
      
      // Check for active orders
      const orders = await getAssignedOrders();
      // Filter for active orders (not delivered or cancelled)
      const active = orders.filter(o => 
        ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
      );
      
      setActiveOrders(active);
      
      // TODO: Fetch real earnings data when API ready
      // const earnings = await getDailyEarnings();
      // setStats(earnings);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    if (!isVerified) {
      Alert.alert('Account Pending', 'Your account is pending approval. You cannot go online yet.');
      return;
    }
    
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    if (newStatus) {
      // Going online - connect WebSocket
      const driverData = await getCurrentDriver();
      if (driverData) {
        await websocketService.connect(driverData.id);
      }
    } else {
      // Going offline - disconnect WebSocket
      websocketService.disconnect();
    }
    
    // TODO: Send status update to API
    // updateDriverStatus(newStatus);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
      }
    >
      {/* Verification Warning Banner */}
      {!isVerified && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Account Pending Approval</Text>
          <Text style={styles.warningSubText}>You cannot go online until an admin approves your account.</Text>
        </View>
      )}

      {/* Header with Online/Offline Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driver?.name || 'Driver'}!</Text>
          <Text style={styles.subtitle}>
            {isOnline ? '🟢 You are online' : '🔴 You are offline'}
          </Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            disabled={!isVerified}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Active Orders List */}
      {activeOrders.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Active Orders ({activeOrders.length})</Text>
          {activeOrders.map(order => (
            <TouchableOpacity 
              key={order.id}
              style={[
                styles.activeOrderCard, 
                order.status === 'ASSIGNED' ? styles.newOrderCard : {}
              ]}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
            >
              <View style={styles.activeOrderHeader}>
                <Text style={styles.activeOrderTitle}>
                  {order.status === 'ASSIGNED' ? '🆕 New Request' : '🚚 Active Delivery'}
                </Text>
                <Text style={[
                  styles.activeOrderStatus,
                  order.status === 'ASSIGNED' ? styles.newOrderStatus : {}
                ]}>
                  {order.status}
                </Text>
              </View>
              <Text style={styles.activeOrderText}>Order #{order.external_order_id || order.id}</Text>
              <Text style={styles.activeOrderText}>{order.restaurant_name} ➡️ {order.delivery_address.substring(0, 30)}...</Text>
              
              {/* Earnings Badge */}
              {order.driver_earnings && (
                <View style={styles.earningsBadge}>
                  <Text style={styles.earningsBadgeLabel}>You'll Earn</Text>
                  <Text style={styles.earningsBadgeAmount}>₹{order.driver_earnings.toFixed(2)}</Text>
                </View>
              )}
              
              <View style={styles.actionButtonContainer}>
                <Text style={styles.viewDetailsButton}>
                  {order.status === 'ASSIGNED' ? 'Review & Accept' : 'View Details'} →
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateText}>
            {isOnline 
              ? 'No active orders. Waiting for new requests...' 
              : 'You are offline. Go online to receive orders.'}
          </Text>
        </View>
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
      {/* Removed static pending section as it was confusing */}
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
    color: '#666',
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
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newOrderCard: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
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
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  newOrderStatus: {
    color: '#2196F3',
  },
  activeOrderText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  actionButtonContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  viewDetailsButton: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyStateCard: {
    margin: 15,
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
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
  earningsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  earningsBadgeLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  earningsBadgeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  warningText: {
    color: '#F57C00',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  warningSubText: {
    color: '#E65100',
    fontSize: 13,
  },
});
