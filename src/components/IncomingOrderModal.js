import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity,
  Animated 
} from 'react-native';

export default function IncomingOrderModal({ visible, order, onAccept, onTimeout }) {
  const [timer, setTimer] = useState(30); // 30 seconds auto-accept
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setTimer(30);
      // Animate entrance
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Countdown timer
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeout(); // Auto-accept after 30 seconds
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // TODO: Play notification sound
      // soundManager.play('new_order');
      
      return () => clearInterval(interval);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!order) return null;

  const isPooled = order.type === 'pooled';
  const backgroundColor = isPooled ? '#2196F3' : '#FF9800';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modal, 
            { 
              backgroundColor,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          {/* Order Type Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {isPooled ? '📦 POOLED ORDER' : '🍽️ SINGLE ORDER'}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timer}s</Text>
            <Text style={styles.timerLabel}>Auto-accepting...</Text>
          </View>

          {/* Restaurant Info */}
          <View style={styles.infoSection}>
            <Text style={styles.restaurantName}>
              {isPooled 
                ? `${order.restaurantCount} Restaurants` 
                : order.restaurantName}
            </Text>
            {isPooled && (
              <Text style={styles.restaurantDetail}>
                {order.restaurants.join(' • ')}
              </Text>
            )}
          </View>

          {/* Earnings & Distance */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Earnings</Text>
              <Text style={styles.statValue}>₹{order.earnings}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{order.distance} km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{order.orderCount}</Text>
            </View>
          </View>

          {/* Pickup Time */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Pickup by:</Text>
            <Text style={styles.timeValue}>{order.pickupTime}</Text>
          </View>

          {/* Accept Button */}
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>✓ ACCEPT NOW</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            {isPooled 
              ? 'Collect orders from all restaurants, then deliver'
              : 'Order will be auto-accepted in {timer} seconds'}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  infoSection: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  restaurantDetail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  acceptButton: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    letterSpacing: 1,
  },
  footerNote: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
});
