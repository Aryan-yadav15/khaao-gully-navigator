import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUSES = [
  { key: 'ASSIGNED', label: 'Assigned', icon: 'clipboard-text-outline' },
  { key: 'ACCEPTED', label: 'Accepted', icon: 'check' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: 'package-variant' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: 'bike' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check-circle-outline' },
];

export default function OrderProgressBar({ currentStatus }) {
  const currentIndex = STATUSES.findIndex(s => s.key === currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.progressLine}>
        {STATUSES.map((status, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <View key={status.key} style={styles.stepContainer}>
              {/* Line before step (except first) */}
              {index > 0 && (
                <View style={[
                  styles.line,
                  { backgroundColor: isActive ? '#D4E157' : '#E0E0E0' }
                ]} />
              )}
              
              {/* Step Circle */}
              <View style={[
                styles.stepCircle,
                {
                  backgroundColor: isActive ? '#D4E157' : '#E0E0E0',
                  borderColor: isCurrent ? '#000' : 'transparent',
                  borderWidth: isCurrent ? 2 : 0,
                }
              ]}>
                <MaterialCommunityIcons 
                  name={status.icon} 
                  size={20} 
                  color={isActive ? '#000' : '#999'} 
                />
              </View>
              
              {/* Label */}
              <Text style={[
                styles.stepLabel,
                { 
                  color: isActive ? '#000' : '#999',
                  fontWeight: isCurrent ? 'bold' : 'normal'
                }
              ]}>
                {status.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 16,
    marginHorizontal: 15,
    elevation: 1,
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 18, // Centered vertically with circle (36/2)
    left: '-50%',
    right: '50%',
    height: 3,
    zIndex: 0,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
