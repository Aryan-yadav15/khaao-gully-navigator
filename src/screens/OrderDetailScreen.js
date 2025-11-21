import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  apiClient, 
  submitOrderEarnings 
} from '../api/client';
import { openGoogleMaps } from '../utils/navigation';
import OrderProgressBar from '../components/OrderProgressBar';
import LocationTracker from '../services/LocationTracker';

// Theme Constants matching HomeScreen
const THEME = {
  dark: '#1A1A1A',
  light: '#FFFFFF',
  accent: '#D4E157', // Lime Green
  grey: '#F5F5F5',
  textGrey: '#888888',
  danger: '#FF5252',
  primary: '#000000'
};

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const response = await apiClient.get(`/driver/orders/${orderId}`);
      setOrder(response.data);
      
      // Update LocationTracker with current order
      if (['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(response.data.status)) {
        LocationTracker.setCurrentOrder(orderId);
        console.log(`📍 Order ${orderId} set in LocationTracker (status: ${response.data.status})`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to load order details: ${error.response?.data?.detail || error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/accept`, { accepted: true });
      fetchOrderDetails();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/pickup`, { pickup_notes: null });
      fetchOrderDetails();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as picked up');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInTransit = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/in-transit`, {});
      LocationTracker.setCurrentOrder(orderId);
      console.log(`📍 Order ${orderId} now IN_TRANSIT, LocationTracker updated`);
      fetchOrderDetails();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverOrder = () => {
    setShowOTPModal(true);
  };

  const verifyAndComplete = async () => {
    if (otpInput.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/deliver`, {
        otp: otpInput,
        delivery_notes: null
      });
      await submitOrderEarnings(orderId, 5.5); // Mock distance
      setShowOTPModal(false);
      Alert.alert('Success', 'Order delivered successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openMap = (lat, lng, label) => {
    if (lat && lng) {
      openGoogleMaps(lat, lng, label);
    } else {
      Alert.alert('Error', 'Location coordinates missing');
    }
  };

  const callCustomer = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (!order) return null;

  const renderActionButton = () => {
    if (actionLoading) {
      return <ActivityIndicator color={THEME.primary} />;
    }

    switch (order.status) {
      case 'ASSIGNED':
        return (
          <TouchableOpacity style={styles.primaryButton} onPress={handleAcceptOrder}>
            <Text style={styles.primaryButtonText}>Accept Order</Text>
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
          </TouchableOpacity>
        );
      case 'ACCEPTED':
        return (
          <View>
            <View style={styles.instructionBox}>
              <MaterialCommunityIcons name="store" size={20} color={THEME.textGrey} />
              <Text style={styles.instructionText}>Navigate to restaurant</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handlePickupOrder}>
              <Text style={styles.primaryButtonText}>Confirm Pickup</Text>
              <MaterialCommunityIcons name="package-variant" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      case 'PICKED_UP':
        return (
          <View>
            <View style={styles.instructionBox}>
              <MaterialCommunityIcons name="map-marker-path" size={20} color={THEME.textGrey} />
              <Text style={styles.instructionText}>Head to customer location</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleInTransit}>
              <Text style={styles.primaryButtonText}>Start Delivery</Text>
              <MaterialCommunityIcons name="bike" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      case 'IN_TRANSIT':
        return (
          <View>
            <View style={styles.instructionBox}>
              <MaterialCommunityIcons name="home-map-marker" size={20} color={THEME.textGrey} />
              <Text style={styles.instructionText}>Arriving at customer</Text>
            </View>
            <TouchableOpacity style={styles.accentButton} onPress={handleDeliverOrder}>
              <Text style={styles.accentButtonText}>Complete Delivery</Text>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        );
      case 'DELIVERED':
        return (
          <View style={styles.completedBanner}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#fff" />
            <Text style={styles.completedText}>Order Completed</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'ASSIGNED': return '#2196F3';
      case 'ACCEPTED': return '#FF9800';
      case 'PICKED_UP': return '#9C27B0';
      case 'IN_TRANSIT': return '#FF5722';
      case 'DELIVERED': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.grey} />
      
      <ScrollView style={styles.container}>
        {/* Header / Status */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.orderId}>Order #{orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>{order.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <OrderProgressBar currentStatus={order.status} />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>{order.estimated_distance_km?.toFixed(1) || '--'} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>{order.estimated_duration_minutes || '--'} min</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>₹{order.driver_earnings?.toFixed(0) || '--'}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Restaurant Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="store" size={20} color={THEME.primary} />
            <Text style={styles.sectionTitle}>PICKUP</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.locationName}>{order.restaurant_name}</Text>
            <Text style={styles.addressText}>{order.pickup_address}</Text>
            <TouchableOpacity 
              style={[styles.actionButton, { width: '100%' }]}
              onPress={() => openMap(order.pickup_lat, order.pickup_lng, order.restaurant_name)}
            >
              <MaterialCommunityIcons name="navigation" size={20} color={THEME.primary} />
              <Text style={styles.actionButtonText}>Navigate to Restaurant</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account" size={20} color={THEME.primary} />
            <Text style={styles.sectionTitle}>DROPOFF</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.locationName}>{order.customer_name}</Text>
            <Text style={styles.addressText}>{order.delivery_address}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, { flex: 1, marginRight: 8 }]}
                onPress={() => openMap(order.delivery_lat, order.delivery_lng, order.customer_name)}
              >
                <MaterialCommunityIcons name="navigation" size={20} color={THEME.primary} />
                <Text style={styles.actionButtonText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => callCustomer(order.customer_phone)}
              >
                <MaterialCommunityIcons name="phone" size={20} color={THEME.primary} />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shopping" size={20} color={THEME.primary} />
            <Text style={styles.sectionTitle}>ORDER DETAILS</Text>
          </View>
          <View style={styles.card}>
            {order.items_json && order.items_json.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{order.order_total}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {renderActionButton()}
      </View>

      {/* OTP Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Verification</Text>
            <Text style={styles.modalSubtitle}>Enter the 6-digit code from the customer</Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity style={styles.verifyButton} onPress={verifyAndComplete}>
              <Text style={styles.verifyButtonText}>Complete Delivery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowOTPModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  timeText: {
    fontSize: 13,
    color: THEME.textGrey,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.textGrey,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.textGrey,
    marginLeft: 8,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    elevation: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary,
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  itemQuantity: {
    fontWeight: 'bold',
    color: THEME.primary,
    marginRight: 10,
    width: 25,
  },
  itemName: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  itemPrice: {
    fontWeight: '600',
    color: THEME.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  accentButton: {
    backgroundColor: THEME.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  accentButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  instructionText: {
    color: THEME.textGrey,
    marginLeft: 8,
    fontSize: 13,
  },
  completedBanner: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 25,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: THEME.primary,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
