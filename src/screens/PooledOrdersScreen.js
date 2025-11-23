import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { openGoogleMaps } from '../utils/navigation';
import { startLocationTracking, stopLocationTracking } from '../utils/location';
import { getAssignedOrders } from '../api/client';
import PoolProgressBar from '../components/PoolProgressBar';
import websocketService from '../services/websocket';
import LocationTracker from '../services/LocationTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PooledOrdersScreen({ route, navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { poolId, orders: initialOrders } = route.params || {};

  const processOrders = (ordersList) => {
    if (!ordersList || ordersList.length === 0) return;

    // Group orders by restaurant
    const grouped = ordersList.reduce((acc, order) => {
      const restId = order.restaurant_name; // Using name as ID for grouping
      if (!acc[restId]) {
        acc[restId] = {
          id: restId,
          name: order.restaurant_name,
          address: order.pickup_address || 'Unknown Address',
          latitude: order.pickup_lat || 0,
          longitude: order.pickup_lng || 0,
          orders: [],
          restaurant_phone: order.restaurant_phone,
          collected: false // Will calculate below
        };
      }
      acc[restId].orders.push(order);
      return acc;
    }, {});

    // Convert to array and add sequence
    const restaurantList = Object.values(grouped).map((r, index) => {
      // Check if all orders for this restaurant are picked up
      const isCollected = r.orders.every(o => 
        ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)
      );
      
      console.log(`Restaurant ${r.name}: ${r.orders.length} orders, collected: ${isCollected}, statuses: ${r.orders.map(o => o.status).join(', ')}`);

      return {
        ...r,
        sequence: index + 1,
        orderCount: r.orders.length,
        distance: 0, // TODO: Calculate distance
        collected: isCollected
      };
    });

    setRestaurants(restaurantList);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      // Add a small delay to ensure backend has committed changes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fetch latest orders from API to get updated status
      const allOrders = await getAssignedOrders();
      // Ensure loose comparison for poolId (string vs number)
      const currentPoolOrders = allOrders.filter(o => o.pool_id == poolId);
      
      console.log(`🔄 Refreshing pool data: Found ${currentPoolOrders.length} orders for pool ${poolId}`);
      
      if (currentPoolOrders.length > 0) {
        processOrders(currentPoolOrders);
      } else {
        // Fallback to initial params if API returns nothing (e.g. offline)
        processOrders(initialOrders);
      }
    } catch (error) {
      console.error("Failed to refresh orders", error);
      // Fallback
      processOrders(initialOrders);
    }
    setRefreshing(false);
  };

  // Refresh data when screen comes into focus (e.g. back from details)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 PooledOrdersScreen focused, refreshing data...');
      loadData();
    }, [poolId])
  );

  // Initialize WebSocket connection and location tracking on mount
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        // Get driver data and connect WebSocket
        const driverDataString = await AsyncStorage.getItem('driver_data');
        if (driverDataString) {
          const driverData = JSON.parse(driverDataString);
          await websocketService.connect(driverData.id);
          console.log('🌐 WebSocket connected for pool order tracking');
        }

        // Set pool ID for location tracking
        LocationTracker.setCurrentOrder(poolId);
        
        // Start location tracking
        await LocationTracker.startTracking();
        console.log('📍 Location tracking started for pool order');
      } catch (error) {
        console.error('Failed to initialize tracking:', error);
      }
    };

    initializeTracking();

    // Cleanup on unmount
    return () => {
      console.log('🛑 PooledOrdersScreen unmounting, cleaning up...');
      // Only stop tracking if we're leaving pool flow entirely
      // (tracking will continue through delivery)
    };
  }, [poolId]);

  const totalOrders = restaurants.reduce((sum, r) => sum + r.orderCount, 0);
  const collectedCount = restaurants.filter(r => r.collected).length;
  const allCollected = restaurants.length > 0 && collectedCount === restaurants.length;

  // No longer need the old startLocationTracking/stopLocationTracking effect
  // LocationTracker is now handling everything

  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('RestaurantPickup', {
      restaurantName: restaurant.name,
      orders: restaurant.orders,
      poolId: poolId
    });
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

    // Navigate to delivery screen with the original orders
    // We need to pass the flattened list of orders
    const allOrders = restaurants.flatMap(r => r.orders);
    navigation.navigate('DeliveryList', { poolId, orders: allOrders });
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

      <PoolProgressBar currentStage={allCollected ? 'IN_TRANSIT' : 'PICKUPS'} />

      {/* Restaurant List */}
      <ScrollView 
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {restaurants.map((restaurant) => (
          <TouchableOpacity 
            key={restaurant.id}
            style={[
              styles.restaurantCard,
              restaurant.collected && styles.restaurantCardCollected
            ]}
            onPress={() => handleRestaurantPress(restaurant)}
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
              <View style={styles.chevronContainer}>
                 <Text style={{fontSize: 20, color: '#ccc'}}>›</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.navigateButton}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering card press
                  handleNavigate(restaurant);
                }}
              >
                <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
              </TouchableOpacity>

              <View 
                style={[
                  styles.statusButton,
                  restaurant.collected ? styles.statusButtonCollected : styles.statusButtonPending
                ]}
              >
                <Text style={[
                  styles.statusButtonText,
                  restaurant.collected && styles.statusButtonTextCollected
                ]}>
                  {restaurant.collected ? '✓ Collected' : 'Tap to Collect'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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
    paddingBottom: 35, // Added extra padding for overlap
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
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 10,
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
  statusButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusButtonCollected: {
    backgroundColor: '#D4E157',
    borderColor: '#D4E157',
  },
  statusButtonPending: {
    backgroundColor: '#fff',
  },
  statusButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  statusButtonTextCollected: {
    color: '#000',
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
