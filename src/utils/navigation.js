import { Linking, Platform, Alert } from 'react-native';

/**
 * Opens the device's native maps app with directions to the specified location
 * @param {number} latitude - Destination latitude
 * @param {number} longitude - Destination longitude
 * @param {string} label - Optional label for the location
 */
export const openGoogleMaps = async (latitude, longitude, label = 'Destination') => {
  const scheme = Platform.select({
    ios: 'maps://app?',
    android: 'geo:',
  });

  const url = Platform.select({
    ios: `maps://app?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`,
  });

  try {
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback to Google Maps web if native app not available
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert('Error', 'Unable to open maps application');
  }
};

/**
 * Opens maps app with the address string
 * @param {string} address - Full address string
 */
export const openMapsWithAddress = async (address) => {
  const encodedAddress = encodeURIComponent(address);
  
  const url = Platform.select({
    ios: `maps://app?q=${encodedAddress}`,
    android: `geo:0,0?q=${encodedAddress}`,
  });

  try {
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert('Error', 'Unable to open maps application');
  }
};
