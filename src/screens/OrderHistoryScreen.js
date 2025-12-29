import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OrderHistoryScreen() {
  const [filter, setFilter] = useState('today'); // today, week, month

  const [orders] = useState([
    {
      id: '1',
      date: '2025-11-18',
      time: '14:35',
      type: 'pooled',
      restaurantCount: 5,
      customerCount: 45,
      distance: 12.3,
      earnings: 750,
      status: 'completed',
    },
    {
      id: '2',
      date: '2025-11-18',
      time: '12:20',
      type: 'pooled',
      restaurantCount: 5,
      customerCount: 38,
      distance: 11.8,
      earnings: 680,
      status: 'completed',
    },
    {
      id: '3',
      date: '2025-11-17',
      time: '19:45',
      type: 'single',
      restaurantCount: 1,
      customerCount: 1,
      distance: 3.2,
      earnings: 82,
      status: 'completed',
    },
    {
      id: '4',
      date: '2025-11-17',
      time: '14:15',
      type: 'pooled',
      restaurantCount: 5,
      customerCount: 42,
      distance: 13.1,
      earnings: 720,
      status: 'completed',
    },
    {
      id: '5',
      date: '2025-11-17',
      time: '12:10',
      type: 'pooled',
      restaurantCount: 5,
      customerCount: 40,
      distance: 12.5,
      earnings: 700,
      status: 'completed',
    },
  ]);

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.date);
    const today = new Date();
    
    if (filter === 'today') {
      return orderDate.toDateString() === today.toDateString();
    } else if (filter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= weekAgo;
    }
    return true; // month - show all
  });

  const totalEarnings = filteredOrders.reduce((sum, o) => sum + o.earnings, 0);
  const totalDeliveries = filteredOrders.length;
  const totalDistance = filteredOrders.reduce((sum, o) => sum + o.distance, 0);

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'today' && styles.filterTabActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'week' && styles.filterTabActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'month' && styles.filterTabActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>₹{totalEarnings}</Text>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalDeliveries}</Text>
          <Text style={styles.summaryLabel}>Deliveries</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalDistance.toFixed(1)} km</Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>
      </View>

      {/* Order List */}
      <ScrollView style={styles.list}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={64} color="#ccc" style={{ marginBottom: 15 }} />
            <Text style={styles.emptyText}>No deliveries found</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View>
                  <View style={styles.orderTypeRow}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 10}}>
                      {order.type === 'pooled' ? (
                        <MaterialCommunityIcons name="layers" size={16} color="#333" style={{marginRight: 6}} />
                      ) : (
                        <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#333" style={{marginRight: 6}} />
                      )}
                      <Text style={styles.orderType}>
                        {order.type === 'pooled' ? 'Pooled' : 'Single'}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialCommunityIcons name="check" size={10} color="#4CAF50" style={{marginRight: 4}} />
                        <Text style={styles.statusText}>{order.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.orderDate}>
                    {order.date} at {order.time}
                  </Text>
                </View>
                <View style={styles.earningsBox}>
                  <Text style={styles.earningsAmount}>₹{order.earnings}</Text>
                </View>
              </View>

              {/* Order Details */}
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Restaurants:</Text>
                  <Text style={styles.detailValue}>{order.restaurantCount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Deliveries:</Text>
                  <Text style={styles.detailValue}>{order.customerCount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>{order.distance} km</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  earningsBox: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderDetails: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
