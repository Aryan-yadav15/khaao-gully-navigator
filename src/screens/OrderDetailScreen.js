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
  Linking
} from 'react-native';
import { 
  apiClient, 
  updateOrderStatus, 
  verifyOTP, 
  submitOrderEarnings 
} from '../api/client';
import { openGoogleMaps } from '../utils/navigation';

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
      console.log(`📡 Fetching order details for Order #${orderId}...`);
      const response = await apiClient.get(`/driver/orders/${orderId}`);
      console.log('✅ Order details response:', response.status);
      console.log('📦 Order data:', JSON.stringify(response.data, null, 2));
      setOrder(response.data);
    } catch (error) {
      console.error('❌ Failed to fetch order details:', error);
      console.error('Error response:', error.response?.status, error.response?.data);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to load order details: ${error.response?.data?.detail || error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/accept`, {
        accepted: true
      });
      fetchOrderDetails();
    } catch (error) {
      console.error('Accept order error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/pickup`, {
        pickup_notes: null
      });
      fetchOrderDetails();
    } catch (error) {
      console.error('Pickup order error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as picked up');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInTransit = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/driver/orders/${orderId}/in-transit`, {});
      fetchOrderDetails();
    } catch (error) {
      console.error('In-transit error:', error.response?.data);
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
      // 1. Verify OTP and Deliver
      await apiClient.post(`/driver/orders/${orderId}/deliver`, {
        otp: otpInput,
        delivery_notes: null
      });

      // 2. Submit Earnings (Mock distance for now)
      await submitOrderEarnings(orderId, 5.5); // 5.5 km mock

      setShowOTPModal(false);
      Alert.alert('Success', 'Order delivered successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      console.error('Delivery error:', error.response?.data);
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
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!order) return null;

  const renderActionButton = () => {
    if (actionLoading) {
      return <ActivityIndicator color="#2196F3" />;
    }

    switch (order.status) {
      case 'ASSIGNED':
        return (
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptOrder}>
            <Text style={styles.buttonText}>Accept Order</Text>
          </TouchableOpacity>
        );
      case 'ACCEPTED':
        return (
          <TouchableOpacity style={styles.primaryButton} onPress={handlePickupOrder}>
            <Text style={styles.buttonText}>Mark Picked Up</Text>
          </TouchableOpacity>
        );
      case 'PICKED_UP':
        return (
          <TouchableOpacity style={styles.primaryButton} onPress={handleInTransit}>
            <Text style={styles.buttonText}>Start Delivery</Text>
          </TouchableOpacity>
        );
      case 'IN_TRANSIT':
        return (
          <TouchableOpacity style={styles.successButton} onPress={handleDeliverOrder}>
            <Text style={styles.buttonText}>Complete Delivery</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <Text style={styles.statusText}>Status: {order.status}</Text>
      </View>

      {/* Restaurant Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🏪 Pickup</Text>
        <Text style={styles.name}>{order.restaurant_name}</Text>
        <Text style={styles.address}>{order.pickup_address}</Text>
        <TouchableOpacity 
          style={styles.actionLink}
          onPress={() => openMap(order.pickup_lat, order.pickup_lng, order.restaurant_name)}
        >
          <Text style={styles.linkText}>📍 Navigate to Restaurant</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👤 Dropoff</Text>
        <Text style={styles.name}>{order.customer_name}</Text>
        <Text style={styles.address}>{order.delivery_address}</Text>
        <View style={styles.row}>
          <TouchableOpacity 
            style={styles.actionLink}
            onPress={() => openMap(order.delivery_lat, order.delivery_lng, order.customer_name)}
          >
            <Text style={styles.linkText}>📍 Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionLink, { marginLeft: 15 }]}
            onPress={() => callCustomer(order.customer_phone)}
          >
            <Text style={styles.linkText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📦 Items</Text>
        {order.items_json && order.items_json.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemQty}>{item.quantity}x</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total to Collect</Text>
          <Text style={styles.totalAmount}>₹{order.order_total}</Text>
        </View>
      </View>

      {/* Earnings Card */}
      {order.driver_earnings && (
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsIcon}>💰</Text>
            <Text style={styles.earningsTitle}>Your Earnings</Text>
          </View>
          <Text style={styles.earningsAmount}>₹{order.driver_earnings.toFixed(2)}</Text>
          <Text style={styles.earningsNote}>Amount you'll earn for this delivery</Text>
        </View>
      )}

      {/* Action Button */}
      <View style={styles.footer}>
        {renderActionButton()}
      </View>

      {/* OTP Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Enter Delivery OTP</Text>
            <Text style={styles.otpSubtitle}>Ask customer for 6-digit code</Text>
            
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
              <Text style={styles.buttonText}>Verify & Complete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowOTPModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: { backgroundColor: '#333', padding: 10, alignItems: 'center' },
  statusText: { color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', margin: 10, padding: 15, borderRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 14, color: '#555', marginBottom: 10 },
  actionLink: { paddingVertical: 5 },
  linkText: { color: '#2196F3', fontWeight: '600' },
  row: { flexDirection: 'row' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  itemQty: { fontWeight: 'bold', marginRight: 10 },
  itemName: { flex: 1 },
  itemPrice: { color: '#555' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontWeight: 'bold' },
  totalAmount: { fontWeight: 'bold', color: '#4CAF50' },
  earningsCard: { 
    backgroundColor: '#E8F5E9', 
    margin: 10, 
    padding: 15, 
    borderRadius: 8, 
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  earningsHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  earningsIcon: { 
    fontSize: 24, 
    marginRight: 8 
  },
  earningsTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#2E7D32',
    textTransform: 'uppercase'
  },
  earningsAmount: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#1B5E20',
    marginBottom: 4
  },
  earningsNote: { 
    fontSize: 12, 
    color: '#558B2F' 
  },
  footer: { padding: 20 },
  acceptButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, alignItems: 'center' },
  primaryButton: { backgroundColor: '#FF9800', padding: 15, borderRadius: 8, alignItems: 'center' },
  successButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  otpModal: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center' },
  otpTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  otpSubtitle: { color: '#666', marginBottom: 20 },
  otpInput: { fontSize: 24, letterSpacing: 5, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, width: '80%', textAlign: 'center', marginBottom: 20 },
  verifyButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  cancelText: { marginTop: 15, color: '#888' }
});
