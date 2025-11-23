import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  RefreshControl,
  Alert,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAssignedOrders, getCurrentDriver, getDriverStats, toggleOnlineStatus as toggleOnlineAPI } from '../api/client';
import websocketService from '../services/websocket';
import LocationTracker from '../services/LocationTracker';

// Theme Constants
const THEME = {
  dark: '#1A1A1A',
  light: '#FFFFFF',
  accent: '#D4E157', // Lime Green
  grey: '#F5F5F5',
  textGrey: '#888888',
  danger: '#FF5252',
  primary: '#000000'
};

export default function HomeScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  // Check if driver is verified
  const isVerified = driver?.status === 'ACTIVE' || driver?.status === 'APPROVED' || driver?.is_verified === true; 
  
  // Real stats from API
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    todayDeliveries: 0,
    weekDeliveries: 0,
    monthDeliveries: 0,
    todayDistance: 0,
  });

  useEffect(() => {
    loadDashboard();
    setupWebSocket();
    
    return () => {
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
      await websocketService.connect(driverData.id);
      websocketService.on('order_assigned', handleOrderAssigned);
      websocketService.on('order_cancelled', handleOrderCancelled);
      websocketService.on('connection_status', handleConnectionStatus);
      websocketService.on('error', handleWSError);
    } catch (error) {
      console.error('❌ WebSocket setup failed:', error);
    }
  };

  const handleOrderAssigned = (data) => {
    LocationTracker.setCurrentOrder(data.order_id || data.id);
    Alert.alert(
      'New Order Assigned',
      `Order #${data.order_id || data.id} has been assigned to you.`,
      [
        { text: 'View', onPress: () => { loadDashboard(); navigation.navigate('OrderDetail', { orderId: data.order_id || data.id }); } },
        { text: 'Close', onPress: () => loadDashboard() }
      ]
    );
  };

  const handleOrderCancelled = (data) => {
    Alert.alert('Order Cancelled', `Order #${data.order_id} has been cancelled.`);
    loadDashboard();
  };

  const handleConnectionStatus = (data) => {
    console.log('🔌 Connection status:', data.connected ? 'Connected' : 'Disconnected');
  };

  const handleWSError = (error) => {
    if (error.code === 'TOKEN_EXPIRED') {
      Alert.alert('Session Expired', 'Please login again.', [{ text: 'OK', onPress: () => navigation.replace('Login') }]);
    }
  };

  const loadDashboard = async () => {
    setRefreshing(true);
    try {
      // Load driver profile
      const driverData = await getCurrentDriver();
      setDriver(driverData);
      setIsOnline(driverData?.is_online || false);
      
      if (driverData?.is_online) {
        LocationTracker.startTracking();
      }

      // Load driver stats
      const statsData = await getDriverStats();
      setStats({
        todayEarnings: statsData.today.earnings,
        weekEarnings: statsData.week.earnings,
        monthEarnings: statsData.month.earnings,
        todayDeliveries: statsData.today.deliveries,
        weekDeliveries: statsData.week.deliveries,
        monthDeliveries: statsData.month.deliveries,
        todayDistance: statsData.today.distance,
      });
      
      // Load orders
      const orders = await getAssignedOrders();
      const active = orders.filter(o => ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status));
      
      if (active.length > 0) {
        LocationTracker.setCurrentOrder(active[0].id);
      } else {
        LocationTracker.setCurrentOrder(null);
      }

      const recent = orders.filter(o => o.status === 'DELIVERED').slice(0, 5);
      setActiveOrders(active);
      setRecentOrders(recent);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    if (!isVerified) {
      Alert.alert('Account Pending', 'Your account is pending approval.');
      return;
    }
    const newStatus = !isOnline;
    
    // Call API to toggle status
    const result = await toggleOnlineAPI(newStatus);
    if (result.success) {
      setIsOnline(newStatus);
      if (newStatus) {
        const driverData = await getCurrentDriver();
        if (driverData) await websocketService.connect(driverData.id);
        LocationTracker.startTracking();
      } else {
        websocketService.disconnect();
        LocationTracker.stopTracking();
      }
    } else {
      Alert.alert('Error', result.message || 'Failed to update status');
    }
  };

  // --- UI Components ---

  const PoolCard = ({ poolId, orders }) => {
    const totalEarnings = orders.reduce((sum, o) => sum + (o.driver_earnings || 0), 0);
    const restaurantCount = new Set(orders.map(o => o.restaurant_name)).size;
    const firstOrder = orders[0];

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: THEME.accent }]}
        onPress={() => navigation.navigate('PooledOrders', { poolId, orders })}
      >
        <View style={styles.cardIconContainer}>
          <MaterialCommunityIcons name="layers" size={24} color={THEME.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Pool Assignment #{poolId}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {orders.length} Orders • {restaurantCount} Restaurants
          </Text>
          <View style={styles.cardFooter}>
            <View style={[styles.statusPill, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statusText, { color: '#2E7D32' }]}>POOL ASSIGNED</Text>
            </View>
            <Text style={styles.priceText}>₹{totalEarnings.toFixed(0)}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const OrderCard = ({ order }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
    >
      <View style={styles.cardIconContainer}>
        <MaterialCommunityIcons name="food" size={24} color={THEME.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{order.restaurant_name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {order.delivery_address}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{order.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.priceText}>₹{order.driver_earnings?.toFixed(0) || '0'}</Text>
        </View>
      </View>
      {order.status === 'ASSIGNED' && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  // Group orders by pool
  const groupedOrders = activeOrders.reduce((acc, order) => {
    if (order.pool_id) {
      if (!acc.pools[order.pool_id]) {
        acc.pools[order.pool_id] = [];
      }
      acc.pools[order.pool_id].push(order);
    } else {
      acc.singles.push(order);
    }
    return acc;
  }, { pools: {}, singles: [] });

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.dark} />
      
      {/* Dark Header Section */}
      <View style={styles.headerContainer}>
        {/* Top Row: Online Status & Earnings */}
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerGreeting}>Hello, {driver?.name || 'Partner'}!</Text>
            <View style={styles.onlineStatusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? THEME.accent : '#666' }]} />
              <Text style={styles.headerStatusText}>
                {isOnline ? 'You are Online' : 'You are Offline'}
              </Text>
            </View>
          </View>
          
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#444', true: 'rgba(212, 225, 87, 0.5)' }}
            thumbColor={isOnline ? THEME.accent : '#f4f3f4'}
          />
        </View>

        {/* Earnings Summary in Header */}
        <View style={styles.headerEarningsCard}>
          <View style={styles.headerEarningsItem}>
            <Text style={styles.headerEarningsLabel}>Today's Earnings</Text>
            <Text style={styles.headerEarningsValue}>₹{stats.todayEarnings}</Text>
          </View>
          <View style={styles.headerVerticalDivider} />
          <View style={styles.headerEarningsItem}>
            <Text style={styles.headerEarningsLabel}>Completed</Text>
            <Text style={styles.headerEarningsValue}>{stats.todayDeliveries} Orders</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
      >
        {/* Active Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Tasks</Text>
        </View>

        {activeOrders.length > 0 ? (
          <>
            {/* Render Pools first */}
            {Object.entries(groupedOrders.pools).map(([poolId, orders]) => (
              <PoolCard key={`pool-${poolId}`} poolId={poolId} orders={orders} />
            ))}
            
            {/* Render Single Orders */}
            {groupedOrders.singles.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="sleep" size={40} color="#ccc" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No active orders</Text>
            <Text style={styles.emptySubtext}>Relax! New orders will appear here.</Text>
          </View>
        )}

        {/* Recent History Section */}
        <View style={[styles.sectionHeader, { marginTop: 25 }]}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length > 0 ? (
          recentOrders.map((order) => (
            <View key={order.id} style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Order #{order.id}</Text>
                <Text style={styles.historySubtitle}>
                  {order.delivered_at 
                    ? new Date(order.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Delivered'}
                </Text>
              </View>
              <Text style={styles.historyAmount}>₹{order.driver_earnings?.toFixed(0) || '0'}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={40} color="#ccc" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No recent deliveries</Text>
          </View>
        )}

        {/* Quick Nav Grid */}
        <Text style={[styles.sectionTitle, {marginTop: 25, marginBottom: 15}]}>Quick Menu</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('OrderHistory')}>
            <MaterialCommunityIcons name="history" size={28} color={THEME.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.gridLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Earnings')}>
            <MaterialCommunityIcons name="cash" size={28} color={THEME.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.gridLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Profile')}>
            <MaterialCommunityIcons name="account" size={28} color={THEME.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.gridLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 100}} /> 
      </ScrollView>

      {/* Floating Action Button (Checkout style) */}
      {activeOrders.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PooledOrders')}>
          <Text style={styles.fabText}>Check {activeOrders.length} Active Orders</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    backgroundColor: THEME.dark,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerStatusText: {
    color: '#888',
    fontSize: 13,
  },
  headerEarningsCard: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  headerEarningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerVerticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#555',
  },
  headerEarningsLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerEarningsValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#888',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  seeAllText: {
    color: '#666',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: THEME.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
