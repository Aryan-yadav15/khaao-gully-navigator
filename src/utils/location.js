import * as Location from 'expo-location';
// import { updateDriverLocation } from '../api/client'; // Removed as we use WebSocket now

let locationSubscription = null;
let lastPosition = null;
let totalDistance = 0; // Track distance in kilometers

/**
 * Haversine formula to calculate distance between two GPS coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
};

/**
 * Request location permissions from the user
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Start tracking driver location and sending updates to Fleetbase
 * Also calculates cumulative distance traveled
 */
export const startLocationTracking = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return;

  // Stop any existing tracking
  stopLocationTracking();

  // Reset tracking data
  lastPosition = null;
  totalDistance = 0;

  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or when driver moves 10 meters
      },
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Calculate distance from last position
        if (lastPosition) {
          const distance = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            latitude,
            longitude
          );
          
          // Only add to total if movement is reasonable (avoid GPS errors)
          // Ignore movements less than 1 meter or more than 1 km
          if (distance > 0.001 && distance < 1) {
            totalDistance += distance;
            console.log(`📏 Distance traveled: ${totalDistance.toFixed(2)} km`);
          }
        }
        
        // Update last position
        lastPosition = { latitude, longitude };
        
        // Send location to Fleetbase API with distance
        // updateDriverLocation(latitude, longitude, totalDistance); // Removed: Using WebSocket for live tracking
        
        console.log(`📍 Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    );
  } catch (error) {
    console.error('Error starting location tracking:', error);
  }
};

/**
 * Stop tracking driver location
 */
export const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log('📍 Location tracking stopped');
  }
};

/**
 * Get current location once (not continuous tracking)
 */
export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Get total distance traveled in current delivery session
 * @returns {number} Distance in kilometers
 */
export const getTotalDistance = () => {
  return totalDistance;
};

/**
 * Reset distance counter (call when starting new delivery)
 */
export const resetDistance = () => {
  totalDistance = 0;
  lastPosition = null;
  console.log('📏 Distance counter reset');
};
