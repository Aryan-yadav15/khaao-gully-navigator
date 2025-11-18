# Navigator App Development Guide
## Building a Custom Driver App for Fleetbase (React Native)

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Development Environment Setup](#development-environment-setup)
4. [Project Structure](#project-structure)
5. [Fleetbase Integration](#fleetbase-integration)
6. [Core Features Implementation](#core-features-implementation)
7. [Real-Time Data Streaming](#real-time-data-streaming)
8. [API Reference](#api-reference)
9. [Testing & Debugging](#testing--debugging)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide will help you build a custom React Native driver app (Navigator) that integrates with your self-hosted Fleetbase instance running on `http://localhost:8000`. The app will:

- Authenticate drivers via Fleetbase API
- Display assigned orders in real-time
- Track driver GPS location and send it to the console
- Update order statuses (accepted, picked up, completed)
- Support order pooling workflows (bulk pickups from multiple restaurants)
- Stream live updates via WebSocket (SocketCluster)

**Why React Native?** As a web developer, React Native lets you use JavaScript/React skills to build iOS and Android apps with a single codebase. If you know React for web, you're 80% ready.

---

## Prerequisites

### Required Knowledge
- JavaScript ES6+ (async/await, promises, arrow functions)
- React basics (components, hooks, state management)
- Basic understanding of REST APIs and WebSockets
- Git version control

### System Requirements
- **Node.js**: v18 or v20 (LTS recommended)
- **npm** or **yarn** or **pnpm**
- **React Native CLI** or **Expo** (we'll use Expo for simplicity)
- **Android Studio** (for Android) or **Xcode** (for iOS, macOS only)
- **Git**
- **Fleetbase Docker stack** running locally (see main README)

### Accounts & Keys
- **Google Maps API Key** (for map display and geocoding)
- **Fleetbase API Key** (generate from `http://localhost:4200` developer console)
- **Firebase** account (optional, for push notifications)

---

## Development Environment Setup

### Step 1: Install Node.js and Package Manager

```bash
# Check if Node is installed
node --version
npm --version

# If not installed, download from https://nodejs.org/
```

### Step 2: Install Expo CLI (Easiest for Beginners)

```bash
npm install -g expo-cli
# or
npm install -g @expo/cli

# Verify installation
expo --version
```

**Why Expo?** Expo simplifies React Native development by removing native build complexity. You can switch to bare React Native later if needed.

### Step 3: Install Development Tools

**For Android:**
- Download and install [Android Studio](https://developer.android.com/studio)
- Install Android SDK (API 33+)
- Create an Android Virtual Device (AVD) emulator

**For iOS (macOS only):**
- Install Xcode from the Mac App Store
- Install Xcode Command Line Tools: `xcode-select --install`
- Open Xcode at least once to accept licenses

### Step 4: Install Git

```bash
# Check if Git is installed
git --version

# If not, download from https://git-scm.com/
```

---

## Project Structure

### Create New Expo Project

```bash
# Create a new Expo app
npx create-expo-app navigator-app --template blank

# Navigate into the project
cd navigator-app

# Install additional dependencies
npm install axios socket.io-client react-native-maps @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install react-native-geolocation-service
npm install expo-location expo-permissions
```

### Recommended Folder Structure

```
navigator-app/
├── App.js                    # Entry point
├── app.json                  # Expo config
├── package.json
├── .env                      # Environment variables (Fleetbase host, keys)
├── src/
│   ├── api/
│   │   ├── fleetbase.js      # Fleetbase API client
│   │   └── socket.js         # SocketCluster WebSocket client
│   ├── components/
│   │   ├── OrderCard.js      # Display order details
│   │   ├── MapView.js        # Driver location map
│   │   └── StatusButton.js   # Update order status
│   ├── screens/
│   │   ├── LoginScreen.js    # Driver login
│   │   ├── HomeScreen.js     # Order list dashboard
│   │   ├── OrderDetailScreen.js  # Single order view
│   │   └── PooledOrderScreen.js  # Bulk pickup orders
│   ├── navigation/
│   │   └── AppNavigator.js   # React Navigation setup
│   ├── utils/
│   │   ├── location.js       # GPS tracking helpers
│   │   └── storage.js        # AsyncStorage helpers
│   └── config/
│       └── constants.js      # App constants
└── assets/
    └── logo.png              # App branding
```

---

## Fleetbase Integration

### Step 1: Configure Environment Variables

Create a `.env` file in your project root:

```env
# .env
APP_NAME=Navigator
APP_IDENTIFIER=io.fleetbase.navigator
APP_LINK_PREFIX=flbnavigator

# Local Fleetbase instance
FLEETBASE_HOST=http://localhost:8000
FLEETBASE_SOCKET_HOST=http://localhost:38000

# API Key (get from Fleetbase Console -> Developer -> API Keys)
FLEETBASE_KEY=your_api_key_here

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_key_here

# Default map center (latitude, longitude)
DEFAULT_COORDINATES=1.369,103.8864
```

**⚠️ Important:**
- For **local development**, use `http://10.0.2.2:8000` if testing on Android emulator (maps to host's localhost)
- For **physical device testing**, use your computer's local IP (e.g., `http://192.168.1.100:8000`)
- Generate `FLEETBASE_KEY` from your Fleetbase console at `http://localhost:4200/console/developers/api-keys`

### Step 2: Install dotenv Support

```bash
npm install react-native-dotenv
```

Configure `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
      }]
    ]
  };
};
```

### Step 3: Create Fleetbase API Client

Create `src/api/fleetbase.js`:

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FLEETBASE_HOST, FLEETBASE_KEY } from '@env';

// Create Axios instance
const fleetbaseAPI = axios.create({
  baseURL: FLEETBASE_HOST,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${FLEETBASE_KEY}`,
  },
});

// Add auth token interceptor
fleetbaseAPI.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
fleetbaseAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      await AsyncStorage.removeItem('driver_token');
      // Navigate to login (implement with navigation ref)
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const loginDriver = async (email, password) => {
  try {
    const response = await fleetbaseAPI.post('/auth/login', {
      identity: email,
      password: password,
    });
    
    const { token, driver } = response.data;
    
    // Store token and driver info
    await AsyncStorage.setItem('driver_token', token);
    await AsyncStorage.setItem('driver_data', JSON.stringify(driver));
    
    return { success: true, driver, token };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Login failed',
    };
  }
};

export const logoutDriver = async () => {
  await AsyncStorage.removeItem('driver_token');
  await AsyncStorage.removeItem('driver_data');
};

export const getCurrentDriver = async () => {
  const driverData = await AsyncStorage.getItem('driver_data');
  return driverData ? JSON.parse(driverData) : null;
};

// ==================== ORDERS ====================

export const getAssignedOrders = async (status = 'assigned') => {
  try {
    const response = await fleetbaseAPI.get('/orders', {
      params: {
        status: status,
        assigned_to_me: true,
        sort: '-created_at',
      },
    });
    return response.data.orders || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

export const getOrderById = async (orderId) => {
  try {
    const response = await fleetbaseAPI.get(`/orders/${orderId}`);
    return response.data.order;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
};

export const updateOrderStatus = async (orderId, newStatus, metadata = {}) => {
  try {
    const response = await fleetbaseAPI.patch(`/orders/${orderId}/status`, {
      status: newStatus,
      ...metadata,
    });
    return { success: true, order: response.data.order };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update status',
    };
  }
};

export const uploadProofOfDelivery = async (orderId, photoUri) => {
  try {
    const formData = new FormData();
    formData.append('proof', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `proof_${orderId}.jpg`,
    });
    
    const response = await fleetbaseAPI.post(
      `/orders/${orderId}/proof`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return { success: true, proof: response.data };
  } catch (error) {
    return { success: false, message: 'Failed to upload proof' };
  }
};

// ==================== POOLED ORDERS ====================

export const getPooledOrders = async (poolId) => {
  try {
    const response = await fleetbaseAPI.get(`/pools/${poolId}/orders`);
    return response.data.orders || [];
  } catch (error) {
    console.error('Error fetching pooled orders:', error);
    return [];
  }
};

export const updateBulkPickupStatus = async (poolId, restaurantId, status) => {
  try {
    const response = await fleetbaseAPI.patch(`/pools/${poolId}/pickup`, {
      restaurant_id: restaurantId,
      status: status,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: 'Failed to update pickup status' };
  }
};

// ==================== LOCATION TRACKING ====================

export const updateDriverLocation = async (latitude, longitude) => {
  try {
    const response = await fleetbaseAPI.post('/driver/location', {
      latitude: latitude,
      longitude: longitude,
      timestamp: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating location:', error);
    return { success: false };
  }
};

export default fleetbaseAPI;
```

---

## Core Features Implementation

### Feature 1: Driver Login Screen

Create `src/screens/LoginScreen.js`:

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { loginDriver } from '../api/fleetbase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await loginDriver(email, password);
    setLoading(false);

    if (result.success) {
      navigation.replace('Home');
    } else {
      Alert.alert('Login Failed', result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigator Driver Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### Feature 2: Order List Dashboard

Create `src/screens/HomeScreen.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { getAssignedOrders } from '../api/fleetbase';

export default function HomeScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setRefreshing(true);
    const data = await getAssignedOrders();
    setOrders(data);
    setRefreshing(false);
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <Text style={styles.orderNumber}>Order #{item.public_id}</Text>
      <Text style={styles.orderStatus}>Status: {item.status}</Text>
      <Text style={styles.orderCustomer}>{item.customer?.name}</Text>
      <Text style={styles.orderAddress}>{item.dropoff_address}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Orders</Text>
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No orders assigned</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: '#fff',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  orderCustomer: {
    fontSize: 14,
    marginBottom: 3,
  },
  orderAddress: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
});
```

### Feature 3: Order Detail with Status Updates

Create `src/screens/OrderDetailScreen.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { getOrderById, updateOrderStatus } from '../api/fleetbase';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    const data = await getOrderById(orderId);
    setOrder(data);
    setLoading(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      Alert.alert('Success', `Order status updated to ${newStatus}`);
      loadOrder(); // Refresh
    } else {
      Alert.alert('Error', result.message);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order #{order.public_id}</Text>
        <Text style={styles.status}>Status: {order.status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text>{order.customer?.name}</Text>
        <Text>{order.customer?.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickup</Text>
        <Text>{order.pickup_address}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drop-off</Text>
        <Text>{order.dropoff_address}</Text>
      </View>

      <View style={styles.actions}>
        {order.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleStatusUpdate('accepted')}
          >
            <Text style={styles.buttonText}>Accept Order</Text>
          </TouchableOpacity>
        )}

        {order.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.button, styles.pickupButton]}
            onPress={() => handleStatusUpdate('picked_up')}
          >
            <Text style={styles.buttonText}>Mark Picked Up</Text>
          </TouchableOpacity>
        )}

        {order.status === 'picked_up' && (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={() => handleStatusUpdate('completed')}
          >
            <Text style={styles.buttonText}>Complete Delivery</Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actions: {
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  pickupButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

## Real-Time Data Streaming

### Setting Up SocketCluster Client

Install the WebSocket library:

```bash
npm install socketcluster-client
```

Create `src/api/socket.js`:

```javascript
import socketCluster from 'socketcluster-client';
import { FLEETBASE_SOCKET_HOST } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

// Initialize socket connection
export const connectSocket = async () => {
  if (socket) return socket;

  const token = await AsyncStorage.getItem('driver_token');
  const driver = await AsyncStorage.getItem('driver_data');
  const driverId = driver ? JSON.parse(driver).id : null;

  socket = socketCluster.create({
    hostname: FLEETBASE_SOCKET_HOST.replace('http://', '').replace('https://', ''),
    port: 38000,
    secure: false,
    autoReconnect: true,
    autoReconnectOptions: {
      initialDelay: 1000,
      maxDelay: 5000,
      multiplier: 1.5,
    },
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected');
    
    // Authenticate
    socket.emit('authenticate', { token, driver_id: driverId });
    
    // Subscribe to driver-specific channel
    if (driverId) {
      subscribeToDriverChannel(driverId);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

// Subscribe to driver's personal channel for order updates
export const subscribeToDriverChannel = (driverId) => {
  if (!socket) return;

  const channel = socket.subscribe(`driver:${driverId}`);
  
  channel.watch((data) => {
    console.log('📩 Received driver update:', data);
    
    // Handle different event types
    switch (data.event) {
      case 'order_assigned':
        // Show notification: "New order assigned!"
        // Refresh order list
        break;
      case 'order_updated':
        // Refresh specific order
        break;
      case 'order_cancelled':
        // Remove order from list
        break;
    }
  });
};

// Publish driver location to socket
export const broadcastLocation = async (latitude, longitude) => {
  if (!socket) return;

  const driver = await AsyncStorage.getItem('driver_data');
  const driverId = driver ? JSON.parse(driver).id : null;

  if (!driverId) return;

  socket.emit('driver:location', {
    driver_id: driverId,
    latitude: latitude,
    longitude: longitude,
    timestamp: new Date().toISOString(),
  });
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default socket;
```

### GPS Location Tracking

Create `src/utils/location.js`:

```javascript
import * as Location from 'expo-location';
import { broadcastLocation } from '../api/socket';
import { updateDriverLocation } from '../api/fleetbase';

let locationSubscription = null;

// Request location permissions
export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Permission to access location was denied');
    return false;
  }
  
  return true;
};

// Start tracking driver location
export const startLocationTracking = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return;

  // Stop any existing tracking
  stopLocationTracking();

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // Update every 5 seconds
      distanceInterval: 10, // Or when driver moves 10 meters
    },
    (position) => {
      const { latitude, longitude } = position.coords;
      
      // Send to API
      updateDriverLocation(latitude, longitude);
      
      // Broadcast via WebSocket for real-time console updates
      broadcastLocation(latitude, longitude);
      
      console.log(`📍 Location updated: ${latitude}, ${longitude}`);
    }
  );
};

// Stop tracking
export const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
};

// Get current location once
export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};
```

### Integrate Location Tracking in App

Update `App.js`:

```javascript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import { connectSocket, disconnectSocket } from './src/api/socket';
import { startLocationTracking, stopLocationTracking } from './src/utils/location';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize socket and location tracking
    const initialize = async () => {
      await connectSocket();
      await startLocationTracking();
    };

    initialize();

    // Cleanup on app close
    return () => {
      disconnectSocket();
      stopLocationTracking();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'My Orders' }}
        />
        <Stack.Screen 
          name="OrderDetail" 
          component={OrderDetailScreen}
          options={{ title: 'Order Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Driver login |
| POST | `/auth/logout` | Driver logout |
| GET | `/auth/me` | Get current driver info |

**Login Request:**
```json
{
  "identity": "driver@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "driver": {
    "id": "driver_uuid",
    "name": "John Driver",
    "email": "driver@example.com",
    "phone": "+1234567890"
  }
}
```

### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | Get assigned orders |
| GET | `/orders/{id}` | Get single order |
| PATCH | `/orders/{id}/status` | Update order status |
| POST | `/orders/{id}/proof` | Upload proof of delivery |

**Get Orders Query Params:**
```
?status=assigned
&assigned_to_me=true
&sort=-created_at
```

**Update Status Request:**
```json
{
  "status": "picked_up",
  "timestamp": "2025-11-15T14:30:00Z"
}
```

### Location Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/driver/location` | Update driver GPS location |

**Location Update Request:**
```json
{
  "latitude": 1.3521,
  "longitude": 103.8198,
  "timestamp": "2025-11-15T14:30:00Z"
}
```

### Order Pooling Endpoints (Custom)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pools/{id}/orders` | Get pooled orders for batch pickup |
| PATCH | `/pools/{id}/pickup` | Update pickup status per restaurant |

---

## Testing & Debugging

### Run the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Test on Physical Device

1. Install **Expo Go** app from Play Store / App Store
2. Scan the QR code from Expo Dev Tools
3. Update `.env` to use your computer's local IP instead of `localhost`

```env
# For physical device testing
FLEETBASE_HOST=http://192.168.1.100:8000
FLEETBASE_SOCKET_HOST=http://192.168.1.100:38000
```

### Debugging Tools

**React Native Debugger:**
```bash
# Install
npm install -g react-devtools

# Run
react-devtools
```

**View Console Logs:**
- Open Expo Dev Tools in browser
- Click "Debug in Chrome" or use Flipper

**Test API Calls:**
```bash
# Test Fleetbase login from command line
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identity":"driver@test.com","password":"password"}'
```

---

## Deployment

### Build for Production

**Android APK:**
```bash
# Configure app.json
eas build --platform android

# Or use Expo classic build
expo build:android
```

**iOS IPA:**
```bash
eas build --platform ios
```

### Configure Production Environment

Create `.env.production`:

```env
FLEETBASE_HOST=https://your-production-domain.com
FLEETBASE_SOCKET_HOST=https://your-production-socket.com:38000
GOOGLE_MAPS_API_KEY=your_production_maps_key
```

### App Store Submission

1. Update `app.json` with production bundle ID, version, and icons
2. Build signed APK/IPA
3. Submit to Google Play Console / Apple App Store Connect
4. Follow platform-specific review guidelines

---

## Troubleshooting

### Issue: "Network request failed"

**Solution:**
- Check if Fleetbase Docker containers are running: `docker-compose ps`
- Verify correct host in `.env` (use `10.0.2.2` for Android emulator)
- Disable firewall blocking port 8000

### Issue: Socket won't connect

**Solution:**
- Ensure SocketCluster container is running on port 38000
- Check WebSocket isn't blocked by firewall
- Verify socket host format (no `http://` prefix in hostname)

### Issue: Location not updating

**Solution:**
- Grant location permissions in device settings
- For iOS simulator: Debug > Location > Custom Location
- For Android emulator: Use emulator controls to set GPS

### Issue: Orders not appearing

**Solution:**
- Create test orders in Fleetbase console
- Assign them to your driver account
- Check driver is authenticated (valid token)
- Refresh order list by pulling down

---

## Next Steps

1. **Add Push Notifications**: Integrate Firebase Cloud Messaging for instant order alerts
2. **Offline Support**: Cache orders with AsyncStorage for offline access
3. **Route Optimization**: Integrate Google Directions API for navigation
4. **Photo Capture**: Add camera functionality for proof of delivery
5. **Signature Capture**: Implement signature pad for customer confirmation
6. **Multi-language Support**: Add i18n for internationalization
7. **Custom Branding**: Replace logos, colors, and app name

---

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Fleetbase API Docs](https://docs.fleetbase.io/)
- [SocketCluster Client](https://socketcluster.io/docs/api-socketcluster-client/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

---

## Support

- **Fleetbase Discord**: https://discord.gg/V7RVWRQ2Wm
- **GitHub Issues**: https://github.com/fleetbase/fleetbase/issues
- **Documentation**: https://docs.fleetbase.io/

---

**Happy Coding! 🚀**
