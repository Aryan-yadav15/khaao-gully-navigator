import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updateOrderStatus } from '../api/client';

const THEME = {
  dark: '#1A1A1A',
  light: '#FFFFFF',
  accent: '#D4E157', // Lime Green
  grey: '#F5F5F5',
  textGrey: '#888888',
  danger: '#FF5252',
  primary: '#000000'
};

export default function RestaurantPickupScreen({ route, navigation }) {
  const { restaurantName, orders, poolId } = route.params;
  const [loading, setLoading] = useState(false);

  // Assuming all orders have same restaurant address/phone for now
  // In real app, this data should come from backend
  const restaurantAddress = orders[0]?.restaurant_address || "Unknown Address";
  const restaurantPhone = orders[0]?.restaurant_phone || "9999999999"; // Hardcoded as requested

  const handleCall = () => {
    Linking.openURL(`tel:${restaurantPhone}`);
  };

  const handleNavigate = () => {
    // Open Google Maps
    const query = encodeURIComponent(restaurantAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleConfirmPickup = async () => {
    setLoading(true);
    try {
      // First, accept all orders that are in ASSIGNED status
      const acceptPromises = orders
        .filter(o => o.status === 'ASSIGNED')
        .map(order => updateOrderStatus(order.id, 'ACCEPTED'));
      
      if (acceptPromises.length > 0) {
        await Promise.all(acceptPromises);
      }
      
      // Then mark all orders as picked up
      const pickupPromises = orders.map(order => updateOrderStatus(order.id, 'PICKED_UP'));
      const results = await Promise.all(pickupPromises);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        Alert.alert('Error', 'Failed to update some orders. Please try again.');
      } else {
        Alert.alert('Success', 'All orders marked as picked up!', [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }
        ]);
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Restaurant Header */}
        <View style={styles.headerCard}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="store" size={40} color={THEME.primary} />
          </View>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
          <Text style={styles.restaurantAddress}>{restaurantAddress}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#2196F3' }]} onPress={handleNavigate}>
              <MaterialCommunityIcons name="navigation" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Orders List */}
        <Text style={styles.sectionTitle}>Orders to Collect ({orders.length})</Text>
        
        {orders.map((order, index) => (
          <View key={order.id || index} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order.id ? String(order.id).slice(0, 8) : 'N/A'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
            
            {/* Items */}
            <View style={styles.itemsContainer}>
              {(() => {
                // Parse items from items_json or items field
                let itemsList = [];
                const itemsData = order.items_json || order.items;
                
                if (Array.isArray(itemsData)) {
                  itemsList = itemsData;
                } else if (typeof itemsData === 'string') {
                  try {
                    itemsList = JSON.parse(itemsData);
                  } catch (e) {
                    console.error('Failed to parse items:', e);
                  }
                }
                
                if (itemsList.length > 0) {
                  return itemsList.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                      <Text style={styles.itemName}>{item.name || item.dish_name}</Text>
                    </View>
                  ));
                } else {
                  return <Text style={styles.itemText}>No items found</Text>;
                }
              })()}
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={handleConfirmPickup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm Pickup</Text>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#000" style={{marginLeft: 10}} />
            </>
          )}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 5,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemsContainer: {
    paddingVertical: 5,
  },
  itemText: {
    color: '#555',
    fontSize: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary,
    marginRight: 8,
    minWidth: 30,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  footer: {
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
  confirmButton: {
    backgroundColor: THEME.accent,
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  }
});
