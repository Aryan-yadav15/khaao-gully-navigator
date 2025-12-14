import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Alert,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openGoogleMaps } from '../utils/navigation';
import { stopLocationTracking, getTotalDistance } from '../utils/location';
import PoolProgressBar from '../components/PoolProgressBar';
import apiClient, { submitOrderEarnings } from '../api/client';
import LocationTracker from '../services/LocationTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme Constants matching HomeScreen/OrderDetailScreen
const THEME = {
  dark: '#1A1A1A',
  light: '#FFFFFF',
  accent: '#D4E157', // Lime Green
  grey: '#F5F5F5',
  textGrey: '#888888',
  danger: '#FF5252',
  primary: '#000000'
};

export default function DeliveryListScreen({ route, navigation }) {
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [customers, setCustomers] = useState([]);
  const { poolId, orders } = route.params || {};

  // Ensure location tracking continues during delivery
  useEffect(() => {
    const ensureTracking = async () => {
      try {
        // Update current order/pool ID for tracking
        LocationTracker.setCurrentOrder(poolId);
        
        // Ensure tracking is active (it should already be running from PooledOrdersScreen)
        if (!LocationTracker.isTracking) {
          await LocationTracker.startTracking();
          console.log('📍 Location tracking restarted in DeliveryListScreen');
        } else {
          console.log('📍 Location tracking already active, continuing...');
        }
      } catch (error) {
        console.error('Failed to ensure location tracking:', error);
      }
    };

    ensureTracking();
  }, [poolId]);

  // Update distance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const distance = getTotalDistance();
      setDistanceTraveled(distance);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (orders && orders.length > 0) {
      // Group orders by customer phone
      const groupedByCustomer = {};
      
      orders.forEach(order => {
        const customerKey = order.customer_phone;
        
        // Format items for this order (handle both items and items_json)
        let formattedItems = [];
        const itemsData = order.items_json || order.items;
        
        if (Array.isArray(itemsData)) {
          formattedItems = itemsData.map(item => `${item.quantity}x ${item.name}`);
        } else if (typeof itemsData === 'string') {
          try {
            const parsed = JSON.parse(itemsData);
            formattedItems = parsed.map(item => `${item.quantity}x ${item.name}`);
          } catch (e) {
            formattedItems = ['Items info unavailable'];
          }
        }
        
        if (!groupedByCustomer[customerKey]) {
          groupedByCustomer[customerKey] = {
            id: order.id, // Use first order ID as primary
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.delivery_address,
            latitude: order.delivery_lat,
            longitude: order.delivery_lng,
            distance: 0,
            orderNumbers: [],
            orderIds: [],
            items: [],
            totalAmount: 0,
            delivered: order.status === 'DELIVERED',
            requiresOTP: true,
            otps: [] // Store all OTPs
          };
        }
        
        // Add order data to grouped customer
        groupedByCustomer[customerKey].orderNumbers.push(`#${order.id}`);
        groupedByCustomer[customerKey].orderIds.push(order.id);
        groupedByCustomer[customerKey].items.push(...formattedItems);
        groupedByCustomer[customerKey].totalAmount += parseFloat(order.total_amount || order.order_total || 0);
        groupedByCustomer[customerKey].otps.push(order.otp);
        
        // If any order is delivered, mark customer as delivered
        if (order.status === 'DELIVERED') {
          groupedByCustomer[customerKey].delivered = true;
        }
      });
      
      // Convert to array
      const customerList = Object.values(groupedByCustomer).map(customer => ({
        ...customer,
        orderNumber: customer.orderNumbers.join(', '),
        otp: customer.otps[0] // Use first OTP (any will work on backend)
      }));
      
      setCustomers(customerList);
    }
  }, [orders]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);

  const deliveredCount = customers.filter(c => c.delivered).length;
  const totalCount = customers.length;
  const allDelivered = deliveredCount === totalCount && totalCount > 0;

  const handleNavigate = (customer) => {
    openGoogleMaps(customer.latitude, customer.longitude, customer.address);
  };

  const handleCallCustomer = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMarkDelivered = (customer) => {
    if (customer.requiresOTP) {
      setSelectedCustomer(customer);
      setOtpInput('');
      setShowOTPModal(true);
    } else {
      confirmDelivery(customer.id);
    }
  };

  const verifyOTPAndDeliver = async () => {
    // Check if OTP matches any of the customer's OTPs
    const validOTP = selectedCustomer.otps.some(otp => otp === otpInput);
    
    if (!validOTP) {
      Alert.alert('Invalid OTP', 'Please enter the correct 4-digit OTP provided by the customer.');
      return;
    }

    try {
      // Call API to mark order as delivered (backend will handle all customer orders)
      await apiClient.post(`/driver/orders/${selectedCustomer.id}/deliver`, {
        otp: otpInput,
        delivery_notes: null
      });

      // Update local state - mark this customer card as delivered
      confirmDelivery(selectedCustomer.id);
      setShowOTPModal(false);
      setSelectedCustomer(null);
      
      const orderCount = selectedCustomer.orderIds.length;
      const successMessage = orderCount > 1 
        ? `All ${orderCount} orders for ${selectedCustomer.name} delivered successfully!`
        : 'Order delivered successfully!';
      
      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('Delivery error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as delivered');
    }
  };

  const confirmDelivery = (customerId) => {
    setCustomers(prev =>
      prev.map(c =>
        c.id === customerId ? { ...c, delivered: true } : c
      )
    );
  };

  const handleCompleteAllDeliveries = () => {
    if (deliveredCount < totalCount) {
      Alert.alert(
        'Incomplete Deliveries',
        'Please complete all deliveries before finishing.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Stop location tracking and get final distance
    const finalDistance = getTotalDistance();
    console.log(`📏 Final distance traveled: ${finalDistance.toFixed(2)} km`);
    stopLocationTracking();
    
    // Stop LocationTracker as well
    LocationTracker.stopTracking();
    LocationTracker.setCurrentOrder(null);
    console.log('🛑 Pool completed, location tracking stopped');

    // Submit earnings with distance to API
    // If poolId exists, use it. Otherwise use the first order's ID.
    const orderIdToSubmit = poolId ? null : (orders && orders.length > 0 ? orders[0].id : null);
    
    if (poolId || orderIdToSubmit) {
      submitOrderEarnings(orderIdToSubmit, finalDistance, poolId)
        .then(res => console.log('Earnings submitted:', res))
        .catch(err => console.error('Failed to submit earnings:', err));
    }

    Alert.alert(
      'All Deliveries Complete!',
      `You've delivered ${totalCount} orders and traveled ${finalDistance.toFixed(2)} km. Great job!`,
      [
        {
          text: 'View Earnings',
          onPress: () => navigation.navigate('Earnings'),
        },
        {
          text: 'Back to Home',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.dark} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Customer Deliveries</Text>
        <View style={styles.headerStats}>
           <Text style={styles.headerSubtitle}>{deliveredCount} / {totalCount} Completed</Text>
        </View>
      </View>

      <PoolProgressBar currentStage={allDelivered ? 'COMPLETED' : 'DELIVERIES'} />

      <ScrollView style={styles.container}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>{distanceTraveled.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Traveled</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>{deliveredCount}/{totalCount}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={20} color={THEME.textGrey} />
            <Text style={styles.statValue}>₹--</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Customer List */}
        <View style={styles.listContainer}>
          {customers
            .sort((a, b) => a.distance - b.distance) // Sort by distance
            .map((customer, index) => (
              <View
                key={customer.id}
                style={[
                  styles.card,
                  customer.delivered && styles.cardDelivered,
                ]}
              >
                {/* Customer Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.customerIcon}>
                    <MaterialCommunityIcons name="account" size={24} color={THEME.primary} />
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.orderNumber}>{customer.orderNumber}</Text>
                  </View>
                  {customer.delivered && (
                    <View style={styles.deliveredBadge}>
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                      <Text style={styles.deliveredText}>Done</Text>
                    </View>
                  )}
                </View>

                {/* Address */}
                <View style={styles.addressContainer}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={THEME.textGrey} style={{marginTop: 2}} />
                  <Text style={styles.addressText}>{customer.address}</Text>
                </View>

                {/* Items */}
                <View style={styles.itemsContainer}>
                  {customer.items.map((item, idx) => (
                    <Text key={idx} style={styles.itemText}>• {item}</Text>
                  ))}
                </View>

                {/* Total Amount */}
                <View style={styles.totalAmountContainer}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color={THEME.accent} />
                  <Text style={styles.totalAmountLabel}>Total to collect: </Text>
                  <Text style={styles.totalAmountValue}>₹{customer.totalAmount.toFixed(2)}</Text>
                </View>

                {/* Actions */}
                {!customer.delivered && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.navigateButton]}
                      onPress={() => handleNavigate(customer)}
                    >
                      <MaterialCommunityIcons name="navigation" size={18} color={THEME.primary} />
                      <Text style={styles.actionButtonText}>Navigate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, styles.callButton]}
                      onPress={() => handleCallCustomer(customer.phone)}
                    >
                      <MaterialCommunityIcons name="phone" size={18} color={THEME.primary} />
                      <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deliverButton]}
                      onPress={() => handleMarkDelivered(customer)}
                    >
                      <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                      <Text style={[styles.actionButtonText, {color: '#fff'}]}>
                        {customer.requiresOTP ? 'Verify OTP' : 'Delivered'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            !allDelivered && styles.completeButtonDisabled,
          ]}
          onPress={handleCompleteAllDeliveries}
          disabled={!allDelivered}
        >
          <Text style={styles.completeButtonText}>
            {allDelivered
              ? '✓ Finish & View Earnings'
              : `Complete remaining deliveries (${totalCount - deliveredCount})`}
          </Text>
        </TouchableOpacity>
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
            <Text style={styles.modalSubtitle}>Enter OTP for {selectedCustomer?.name}</Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="0000"
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            <TouchableOpacity style={styles.verifyButton} onPress={verifyOTPAndDeliver}>
              <Text style={styles.verifyButtonText}>Verify & Complete</Text>
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
  header: {
    backgroundColor: THEME.dark,
    padding: 20,
    paddingTop: 15,
    paddingBottom: 35,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.accent,
    fontWeight: '600',
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
  listContainer: {
    paddingHorizontal: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardDelivered: {
    backgroundColor: '#F9FBE7',
    borderColor: THEME.accent,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  orderNumber: {
    fontSize: 12,
    color: THEME.textGrey,
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 10,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    lineHeight: 18,
  },
  itemsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  itemText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 4,
  },
  navigateButton: {
    backgroundColor: THEME.accent,
  },
  callButton: {
    backgroundColor: '#E0E0E0',
  },
  deliverButton: {
    backgroundColor: THEME.primary,
    flex: 1.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
    marginLeft: 6,
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
  completeButton: {
    backgroundColor: THEME.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  totalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  totalAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.accent,
  },
});
