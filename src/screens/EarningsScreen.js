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
          <Text style={styles.totalLabel}>Total Earnings</Text>
          <Text style={styles.totalAmount}>₹{currentEarnings.total.toFixed(2)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{currentEarnings.deliveries}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{currentEarnings.distance.toFixed(1)} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Earnings Breakdown</Text>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>Base Pay</Text>
                <Text style={styles.breakdownDetail}>
                  Earnings from deliveries
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>
                ₹{currentEarnings.basePay.toFixed(2)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>Distance Pay</Text>
                <Text style={styles.breakdownDetail}>
                  ₹10 × {currentEarnings.distance.toFixed(1)} km
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>
                ₹{currentEarnings.distancePay.toFixed(2)}
              </Text>
            </View>

            {currentEarnings.bonus > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownLabel}>Bonus</Text>
                    <Text style={styles.breakdownDetail}>
                      Performance bonus & incentives
                    </Text>
                  </View>
                  <Text style={[styles.breakdownAmount, styles.bonusAmount]}>
                    +₹{currentEarnings.bonus.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Fuel Reimbursement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⛽ Fuel Reimbursement</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance Traveled:</Text>
              <Text style={styles.infoValue}>{currentEarnings.distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate:</Text>
              <Text style={styles.infoValue}>₹10 per km</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowTotal]}>
              <Text style={styles.infoLabelTotal}>Total Reimbursement:</Text>
              <Text style={styles.infoValueTotal}>
                ₹{(currentEarnings.distance * 10).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Status</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ PAID</Text>
              </View>
              <Text style={styles.paymentAmount}>₹{currentEarnings.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.paymentNote}>
              All earnings have been credited to your account
            </Text>
          </View>
        </View>

        {/* How Earnings Work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ How Earnings Work</Text>
          <View style={styles.helpCard}>
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Base Pay:</Text> ₹50 per delivery
            </Text>
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Distance Pay:</Text> ₹10 per kilometer driven
            </Text>
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Bonus:</Text> Extra earnings for high performance
            </Text>
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Fuel Reimbursement:</Text> Included in distance pay
            </Text>
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
