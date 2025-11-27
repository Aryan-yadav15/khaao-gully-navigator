import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { getDriverStats } from '../api/client';

export default function EarningsScreen() {
  const [filter, setFilter] = useState('today'); // today, week, month
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState({
    today: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
    week: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
    month: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
    summary: {
      total_pending_earnings: 0,
      total_paid_earnings: 0,
      lifetime_earnings: 0,
      total_deliveries: 0,
      last_payment_date: null,
      last_payment_amount: 0
    }
  });

  const fetchEarnings = async () => {
    try {
      const data = await getDriverStats();
      if (data) {
        setEarningsData(data);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#D4E157" />
      </View>
    );
  }

  const currentEarnings = earningsData[filter] || earningsData.today;
  const summary = earningsData.summary || {};

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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4E157" />
        }
      >
        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Earned (Lifetime)</Text>
          <Text style={styles.totalAmount}>₹{summary.lifetime_earnings?.toFixed(2) || '0.00'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.total_deliveries || 0}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹{summary.total_paid_earnings?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Status</Text>
          
          {/* Pending Payment */}
          <View style={[styles.paymentCard, { marginBottom: 15 }]}>
            <View style={styles.paymentRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.statusText, { color: '#FF9800' }]}>⏳ PENDING</Text>
              </View>
              <Text style={styles.paymentAmount}>₹{summary.total_pending_earnings?.toFixed(2) || '0.00'}</Text>
            </View>
            <Text style={styles.paymentNote}>
              Amount to be paid in next cycle
            </Text>
          </View>

          {/* Last Payment */}
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ LAST PAID</Text>
              </View>
              <Text style={styles.paymentAmount}>
                {summary.last_payment_amount ? `₹${summary.last_payment_amount.toFixed(2)}` : '₹0.00'}
              </Text>
            </View>
            <Text style={styles.paymentNote}>
              {summary.last_payment_date 
                ? `Paid on ${new Date(summary.last_payment_date).toLocaleDateString()}`
                : 'No payments received yet'}
            </Text>
          </View>
        </View>

        {/* Current Period Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 {filter === 'today' ? "Today's" : filter === 'week' ? "This Week's" : "This Month's"} Stats</Text>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>Deliveries</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {currentEarnings.deliveries}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>Earnings</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                ₹{currentEarnings.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 15,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  filterTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#333',
  },
  filterTabActive: {
    backgroundColor: '#D4E157',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  filterTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
  },
  totalCard: {
    backgroundColor: '#1A1A1A',
    margin: 15,
    padding: 25,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: '#D4E157',
    opacity: 0.9,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  breakdownDetail: {
    fontSize: 13,
    color: '#888',
  },
  breakdownAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  bonusAmount: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  infoLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentNote: {
    fontSize: 13,
    color: '#888',
  },
  helpCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 0,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: '600',
    color: '#000',
  },
});
