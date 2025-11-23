import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const POOL_STAGES = [
  { key: 'ACCEPTED', label: 'Accepted', icon: 'check' },
  { key: 'PICKUPS', label: 'Pickups', icon: 'store' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: 'bike' },
  { key: 'DELIVERIES', label: 'Deliveries', icon: 'home-map-marker' },
  { key: 'COMPLETED', label: 'All Done', icon: 'check-all' },
];

export default function PoolProgressBar({ currentStage }) {
  const currentIndex = POOL_STAGES.findIndex(s => s.key === currentStage);

  return (
    <View style={styles.container}>
      <View style={styles.progressLine}>
        {POOL_STAGES.map((stage, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <View key={stage.key} style={styles.stepContainer}>
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
                  name={stage.icon} 
                  size={18} 
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
                {stage.label}
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
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 16,
    marginHorizontal: 15,
    elevation: 2,
    marginTop: -20, // Overlap effect
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
    top: 15, // Centered vertically with circle (30/2)
    left: '-50%',
    right: '50%',
    height: 3,
    zIndex: 0,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
