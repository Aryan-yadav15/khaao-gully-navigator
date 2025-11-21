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
  Alert 
} from 'react-native';
import { openGoogleMaps } from '../utils/navigation';
import { stopLocationTracking, getTotalDistance } from '../utils/location';

export default function DeliveryListScreen({ route, navigation }) {
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  // Update distance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const distance = getTotalDistance();
      setDistanceTraveled(distance);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const [customers, setCustomers] = useState([
    {
      id: '1',
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      address: 'Room 405, Hostel A, University Campus',
      latitude: 28.7041,
      longitude: 77.1025,
      distance: 0.3,
      orderNumber: '#12345',
      items: ['2x Margherita Pizza', '1x Coke'],
      delivered: false,
      requiresOTP: true,
    },
    {
      id: '2',
      name: 'Priya Patel',
      phone: '+91 98765 43211',
      address: 'Room 203, Hostel B, University Campus',
      latitude: 28.7045,
      longitude: 77.1030,
      distance: 0.5,
      orderNumber: '#12346',
      items: ['1x Chicken Burger', '1x Fries', '1x Pepsi'],
      delivered: false,
      requiresOTP: true,
    },
    {
      id: '3',
      name: 'Amit Kumar',
      phone: '+91 98765 43212',
      address: 'Room 101, Hostel C, University Campus',
      latitude: 28.7050,
      longitude: 77.1035,
      distance: 0.7,
      orderNumber: '#12347',
      items: ['1x Veg Chowmein', '1x Spring Rolls'],
      delivered: false,
      requiresOTP: true,
    },
  ]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);

  const deliveredCount = customers.filter(c => c.delivered).length;
  const totalCount = customers.length;

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

  const verifyOTPAndDeliver = () => {
    // TODO: Verify OTP with API
    // For now, simulate verification
    if (otpInput.length === 4) {
      confirmDelivery(selectedCustomer.id);
      setShowOTPModal(false);
      setSelectedCustomer(null);
      Alert.alert('Success', 'Order delivered successfully!');
    } else {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit OTP');
    }
  };

  const confirmDelivery = (customerId) => {
    setCustomers(prev =>
      prev.map(c =>
        c.id === customerId ? { ...c, delivered: true } : c
      )
    );

    // TODO: Update order status via API
    // updateOrderStatus(customerId, 'delivered');
    // submitOrderEarnings(orderId, totalDistance);
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

    // TODO: Submit earnings with distance to API
    // submitOrderEarnings(orderId, finalDistance, poolId);

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚚 Deliveries</Text>
          <Text style={styles.distanceText}>📏 {distanceTraveled.toFixed(2)} km traveled</Text>
        </View>
        <Text style={styles.progressText}>
          {deliveredCount} / {totalCount} delivered
        </Text>
      </View>

      {/* Customer List */}
      <ScrollView style={styles.list}>
        {customers
          .sort((a, b) => a.distance - b.distance) // Sort by distance
          .map((customer) => (
            <View
              key={customer.id}
              style={[
                styles.customerCard,
                customer.delivered && styles.customerCardDelivered,
              ]}
            >
              {/* Customer Info */}
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.orderNumber}>{customer.orderNumber}</Text>
                  <Text style={styles.address}>{customer.address}</Text>
                  <Text style={styles.distance}>📍 {customer.distance} km away</Text>
                </View>

                {customer.delivered && (
                  <View style={styles.deliveredBadge}>
                    <Text style={styles.deliveredBadgeText}>✓</Text>
                  </View>
                )}
              </View>

              {/* Order Items */}
              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items:</Text>
                {customer.items.map((item, index) => (
                  <Text key={index} style={styles.item}>• {item}</Text>
                ))}
              </View>

              {/* Actions */}
              {!customer.delivered && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => handleNavigate(customer)}
                  >
                    <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCallCustomer(customer.phone)}
                  >
                    <Text style={styles.callButtonText}>📞 Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deliveredButton}
                    onPress={() => handleMarkDelivered(customer)}
                  >
                    <Text style={styles.deliveredButtonText}>
                      {customer.requiresOTP ? '✓ OTP' : '✓ Delivered'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
      </ScrollView>

      {/* OTP Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Enter OTP from Customer</Text>
            <Text style={styles.otpSubtitle}>
              Customer: {selectedCustomer?.name}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="1234"
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={verifyOTPAndDeliver}
            >
              <Text style={styles.verifyButtonText}>Verify & Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowOTPModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.otpNote}>
              📝 Note: OTP verification will be connected to admin console in Phase 2
            </Text>
          </View>
        </View>
      </Modal>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            deliveredCount < totalCount && styles.completeButtonDisabled,
          ]}
          onPress={handleCompleteAllDeliveries}
          disabled={deliveredCount < totalCount}
        >
          <Text style={styles.completeButtonText}>
            {deliveredCount < totalCount
              ? `Complete remaining deliveries (${totalCount - deliveredCount})`
              : '✓ Finish & View Earnings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  distanceText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerCardDelivered: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
    opacity: 0.7,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  deliveredBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveredBadgeText: {
    fontSize: 24,
    color: '#fff',
  },
  itemsSection: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    fontWeight: '600',
  },
  item: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  deliveredButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deliveredButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    alignItems: 'center',
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  otpInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#2196F3',
    padding: 20,
    borderRadius: 12,
    fontSize: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 10,
    marginBottom: 20,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#999',
    fontSize: 14,
    marginTop: 10,
  },
  otpNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
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
});
