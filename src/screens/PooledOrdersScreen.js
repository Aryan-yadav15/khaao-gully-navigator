import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { openGoogleMaps } from '../utils/navigation';
import { startLocationTracking, stopLocationTracking } from '../utils/location';

export default function PooledOrdersScreen({ route, navigation }) {
  const [restaurants, setRestaurants] = useState([
    {
      id: '1',
      sequence: 1,
      name: 'Pizza Palace',
      orderCount: 8,
      address: '123 Main Street, Near City Mall',
      latitude: 28.7041,
      longitude: 77.1025,
      distance: 1.2,
      collected: false,
    },
    {
      id: '2',
      sequence: 2,
      name: 'Burger Kingdom',
      orderCount: 12,
      address: '456 Oak Avenue, Food Court',
      latitude: 28.7051,
      longitude: 77.1035,
      distance: 2.5,
      collected: false,
    },
    {
      id: '3',
      sequence: 3,
      name: 'Chinese Wok',
      orderCount: 6,
      address: '789 Pine Road, Market Area',
      latitude: 28.7061,
      longitude: 77.1045,
      distance: 3.8,
      collected: false,
    },
    {
      id: '4',
      sequence: 4,
      name: 'South Indian Express',
      orderCount: 10,
      address: '321 Birch Lane, Temple Street',
      latitude: 28.7071,
      longitude: 77.1055,
      distance: 4.2,
      collected: false,
    },
    {
      id: '5',
      sequence: 5,
      name: 'Tandoori Nights',
      orderCount: 9,
      address: '654 Cedar Drive, University Road',
      latitude: 28.7081,
      longitude: 77.1065,
      distance: 5.1,
      collected: false,
    },
  ]);

  const totalOrders = restaurants.reduce((sum, r) => sum + r.orderCount, 0);
  const collectedCount = restaurants.filter(r => r.collected).length;
  const allCollected = collectedCount === restaurants.length;

  // Start location tracking when screen mounts
  useEffect(() => {
    console.log('📍 Starting location tracking for pickup...');
    startLocationTracking();

    // Clean up tracking if user navigates away before finishing
    return () => {
      // Don't stop if proceeding to delivery, only if going back
      if (!allCollected) {
        console.log('📍 Pickup incomplete, stopping location tracking');
        stopLocationTracking();
      }
    };
  }, []);

  const toggleCollected = (restaurantId) => {
    setRestaurants(prev => 
      prev.map(r => 
        r.id === restaurantId ? { ...r, collected: !r.collected } : r
      )
    );

    // TODO: Update status via API
    // markRestaurantPickupComplete(restaurantId);
  };

  const handleNavigate = (restaurant) => {
    openGoogleMaps(restaurant.latitude, restaurant.longitude, restaurant.name);
  };

  const handleProceedToDelivery = () => {
    if (!allCollected) {
      Alert.alert(
        'Incomplete Pickups',
        'Please collect orders from all restaurants before proceeding to delivery.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to delivery screen
    navigation.navigate('DeliveryList', { poolId: route.params?.poolId });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Restaurant Pickups</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {collectedCount} / {restaurants.length} collected
          </Text>
          <Text style={styles.orderCountText}>{totalOrders} total orders</Text>
        </View>
      </View>

      {/* Restaurant List */}
      <ScrollView style={styles.list}>
        {restaurants.map((restaurant) => (
          <View 
            key={restaurant.id}
            style={[
              styles.restaurantCard,
              restaurant.collected && styles.restaurantCardCollected
            ]}
          >
            {/* Restaurant Info */}
            <View style={styles.restaurantHeader}>
              <View style={styles.sequenceBadge}>
                <Text style={styles.sequenceText}>{restaurant.sequence}</Text>
              </View>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    📦 {restaurant.orderCount} orders
                  </Text>
                  <Text style={styles.metaText}>
                    📍 {restaurant.distance} km away
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.navigateButton}
                onPress={() => handleNavigate(restaurant)}
              >
                <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.checkButton,
                  restaurant.collected && styles.checkButtonActive
                ]}
                onPress={() => toggleCollected(restaurant.id)}
              >
                <Text style={[
                  styles.checkButtonText,
                  restaurant.collected && styles.checkButtonTextActive
                ]}>
                  {restaurant.collected ? '✓ Collected' : 'Mark Collected'}
                </Text>
              </TouchableOpacity>
            </View>

            {restaurant.collected && (
              <View style={styles.collectedBadge}>
                <Text style={styles.collectedBadgeText}>✓ COLLECTED</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Proceed to Delivery Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.proceedButton,
            !allCollected && styles.proceedButtonDisabled
          ]}
          onPress={handleProceedToDelivery}
          disabled={!allCollected}
        >
          <Text style={styles.proceedButtonText}>
            {allCollected 
              ? `🚚 Proceed to Delivery (${totalOrders} orders)` 
              : 'Complete all pickups first'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    paddingTop: 15,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4E157',
  },
  orderCountText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  list: {
    flex: 1,
    padding: 15,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantCardCollected: {
    borderColor: '#D4E157',
    backgroundColor: '#F9FBE7',
  },
  restaurantHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  sequenceBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sequenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4E157',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginRight: 15,
  },
  actions: {
    flexDirection: 'row',
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  checkButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkButtonActive: {
    backgroundColor: '#D4E157',
    borderColor: '#D4E157',
  },
  checkButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  checkButtonTextActive: {
    color: '#000',
  },
  collectedBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#D4E157',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collectedBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  proceedButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: '#ccc',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
