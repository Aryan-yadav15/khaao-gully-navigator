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
  Image,
  TextInput,
  StatusBar
} from 'react-native';
import { getAssignedOrders, getCurrentDriver } from '../api/client';
import websocketService from '../services/websocket';

// Theme Constants based on reference image
const THEME = {
  dark: '#1A1A1A',
  light: '#FFFFFF',
  accent: '#D4E157', // Lime Green
  grey: '#F5F5F5',
  textGrey: '#888888',
  danger: '#FF5252'
};

export default function HomeScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Active'); // For filter chips

  // Check if driver is verified (Mock logic - replace with actual field from API)
  const isVerified = driver?.status === 'active' || driver?.is_verified === true || true; 
  
  // Mock data for demo
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
    Alert.alert(
      '🚚 New Order Assigned!',
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
      const driverData = await getCurrentDriver();
      setDriver(driverData);
      const orders = await getAssignedOrders();
      const active = orders.filter(o => ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status));
      setActiveOrders(active);
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
    setIsOnline(newStatus);
    if (newStatus) {
      const driverData = await getCurrentDriver();
      if (driverData) await websocketService.connect(driverData.id);
    } else {
      websocketService.disconnect();
    }
  };

  // --- UI Components ---

  const StatusChip = ({ label, active }) => (
    <TouchableOpacity 
      style={[styles.chip, active && styles.chipActive]}
      onPress={() => setSelectedCategory(label)}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {active ? '● ' : ''}{label}
      </Text>
    </TouchableOpacity>
  );

  const OrderCard = ({ order }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
    >
      <View style={styles.cardImagePlaceholder}>
        <Text style={{fontSize: 30}}>🍱</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{order.restaurant_name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {order.delivery_address}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
          <Text style={styles.priceText}>₹{order.driver_earnings?.toFixed(0) || '0'}</Text>
        </View>
      </View>
      {order.status === 'ASSIGNED' && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
          <TouchableOpacity onPress={() => navigation.navigate('PooledOrders')}>
            <Text style={styles.seeAllText}>View Pool →</Text>
          </TouchableOpacity>
        </View>

        {activeOrders.length > 0 ? (
          activeOrders.map(order => <OrderCard key={order.id} order={order} />)
        ) : (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 10}}>😴</Text>
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

        {/* Mock Recent Orders */}
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.historyRow}>
            <View style={styles.historyIcon}>
              <Text>✅</Text>
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyTitle}>Order #100{i}</Text>
              <Text style={styles.historySubtitle}>Delivered at 2:30 PM</Text>
            </View>
            <Text style={styles.historyAmount}>₹45</Text>
          </View>
        ))}

        {/* Quick Nav Grid */}
        <Text style={[styles.sectionTitle, {marginTop: 25, marginBottom: 15}]}>Quick Menu</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('OrderHistory')}>
            <Text style={styles.gridIcon}>📜</Text>
            <Text style={styles.gridLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.gridIcon}>💰</Text>
            <Text style={styles.gridLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.gridIcon}>👤</Text>
            <Text style={styles.gridLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 100}} /> 
      </ScrollView>

      {/* Floating Action Button (Checkout style) */}
      {activeOrders.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PooledOrders')}>
          <Text style={styles.fabText}>Check {activeOrders.length} Active Orders</Text>
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
  searchBar: {
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
    color: '#888',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  chipContainer: {
    paddingLeft: 20,
  },
  chip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: THEME.accent,
  },
  chipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#000',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  earningsBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
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
  cardImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
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
  gridIcon: {
    fontSize: 24,
    marginBottom: 8,
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
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
