import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Alert 
} from 'react-native';
import { logoutDriver } from '../api/client';

export default function ProfileScreen({ navigation }) {
  // Mock driver data
  const [driver] = useState({
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.driver@khaoogully.com',
    vehicleNumber: 'DL 01 AB 1234',
    vehicleType: 'Motorcycle',
    joinDate: '2025-01-15',
    totalDeliveries: 450,
    rating: 4.8,
  });

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'Call Khaao Gully support?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Support',
          onPress: () => Linking.openURL('tel:+911234567890'),
        },
      ]
    );
  };

  const handleChatSupport = () => {
    Alert.alert(
      'Support Chat',
      'Chat feature will be available soon. For now, please call support.',
      [
        { text: 'OK' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:+911234567890'),
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logoutDriver();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{driver.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{driver.name}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingText}>⭐ {driver.rating}</Text>
          <Text style={styles.ratingSubtext}>({driver.totalDeliveries} deliveries)</Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📞 Phone</Text>
            <Text style={styles.infoValue}>{driver.phone}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📧 Email</Text>
            <Text style={styles.infoValue}>{driver.email}</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🏍️ Type</Text>
            <Text style={styles.infoValue}>{driver.vehicleType}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🔢 Number</Text>
            <Text style={styles.infoValue}>{driver.vehicleNumber}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {/* SOS Button */}
        <TouchableOpacity 
          style={[styles.actionButton, styles.sosButton]}
          onPress={handleSOS}
        >
          <Text style={styles.actionIcon}>🆘</Text>
          <View style={styles.actionContent}>
            <Text style={[styles.actionText, styles.sosText]}>Emergency SOS</Text>
            <Text style={styles.actionSubtext}>Call support immediately</Text>
          </View>
        </TouchableOpacity>

        {/* Chat Support */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleChatSupport}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Chat with Support</Text>
            <Text style={styles.actionSubtext}>Get help from our team</Text>
          </View>
        </TouchableOpacity>

        {/* App Settings */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>App Settings</Text>
            <Text style={styles.actionSubtext}>Notifications, language, etc.</Text>
          </View>
        </TouchableOpacity>

        {/* Help & FAQ */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>❓</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Help & FAQ</Text>
            <Text style={styles.actionSubtext}>Common questions answered</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Khaao Gully Navigator v1.0.0</Text>
        <Text style={styles.footerText}>Joined {driver.joinDate}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sosButton: {
    backgroundColor: '#FFF3CD',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sosText: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  actionSubtext: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  footer: {
    alignItems: 'center',
    padding: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
