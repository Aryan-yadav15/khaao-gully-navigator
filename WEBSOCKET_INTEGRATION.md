# WebSocket Integration Guide

## ✅ You're Thinking Correctly!

**React Native CAN handle WebSocket connections directly** - you don't need a separate "middleware" service between your React Native app and the backend.

## Architecture

```
┌─────────────────────────┐
│   React Native App      │
│   (Your Mobile App)     │
│                         │
│  - WebSocket Client     │
│  - Location Tracking    │
│  - UI/UX                │
└────────┬────────────────┘
         │
         │ Direct WebSocket Connection (ws:// or wss://)
         │
         ▼
┌─────────────────────────┐
│   Backend Server        │
│   (FastAPI/Node/etc.)   │
│                         │
│  - WebSocket Server     │
│  - Business Logic       │
│  - Database             │
│  - Order Management     │
└─────────────────────────┘
```

## What You Need

### 1. Backend Service (Required)
You need **ONE** backend that handles:
- WebSocket connections (`/api/v1/ws/driver/{driver_id}`)
- REST API endpoints (login, orders, etc.)
- Database operations
- Order assignment logic

**Common Backend Choices:**
- FastAPI (Python) - Excellent WebSocket support
- Node.js with Socket.io or ws
- Django Channels
- Go with Gorilla WebSocket

### 2. React Native App (Frontend)
Your mobile app connects **directly** to the backend WebSocket using:
- Built-in JavaScript WebSocket API (no extra library needed!)
- Or `react-native-websocket` for advanced features

## Files Created

### ✅ `src/services/websocket.js`
Complete WebSocket service with:
- Auto-reconnection with exponential backoff
- Ping/pong heartbeat
- Token refresh on auth failure
- Event-based architecture
- Location update automation

### ✅ Updated `.env`
Added:
```env
API_BASE_URL=http://10.0.2.2:8000
WS_BASE_URL=ws://10.0.2.2:8000
```

## How to Use in Your App

### Example: HomeScreen with WebSocket Integration

```javascript
import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import websocketService from '../services/websocket';

export default function HomeScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    // Setup event listeners
    websocketService.on('connection_status', handleConnectionStatus);
    websocketService.on('order_assigned', handleNewOrder);
    websocketService.on('order_cancelled', handleOrderCancelled);
    websocketService.on('error', handleError);

    return () => {
      // Cleanup listeners
      websocketService.off('connection_status', handleConnectionStatus);
      websocketService.off('order_assigned', handleNewOrder);
      websocketService.off('order_cancelled', handleOrderCancelled);
      websocketService.off('error', handleError);
    };
  }, []);

  const toggleOnlineStatus = async () => {
    if (!isOnline) {
      // Going online
      const driverId = await AsyncStorage.getItem('driverId');
      await requestLocationPermission();
      await websocketService.connect(driverId);
      websocketService.startLocationUpdates(getCurrentLocation);
      setIsOnline(true);
    } else {
      // Going offline
      websocketService.disconnect();
      setIsOnline(false);
    }
  };

  const handleConnectionStatus = ({ connected }) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  };

  const handleNewOrder = (orderData) => {
    // Show notification or modal
    Alert.alert(
      'New Order Assigned! 🎉',
      `Order #${orderData.order_id}\n${orderData.restaurant_name}\nEarnings: ₹${orderData.earnings}`,
      [
        { text: 'View Order', onPress: () => navigation.navigate('OrderDetail', { orderId: orderData.order_id }) }
      ]
    );
  };

  const handleOrderCancelled = ({ order_id, reason }) => {
    Alert.alert('Order Cancelled', `Order #${order_id}\nReason: ${reason}`);
  };

  const handleError = ({ message, code }) => {
    if (code === 'DUPLICATE_CONNECTION') {
      Alert.alert('Logged in elsewhere', message);
      // Redirect to login
      navigation.navigate('Login');
    } else {
      Alert.alert('Connection Error', message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const battery = await getBatteryLevel(); // Use expo-battery

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        battery_level: battery
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required');
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <Text>Status: {connectionStatus}</Text>
      <Switch value={isOnline} onValueChange={toggleOnlineStatus} />
      {/* Rest of your UI */}
    </View>
  );
}
```

## Required Dependencies

Install these packages:

```bash
# Location tracking
npm install expo-location

# Secure storage
npm install @react-native-async-storage/async-storage

# Battery level (optional)
npm install expo-battery

# Environment variables
npm install react-native-dotenv
```

## Backend Requirements

Your backend must implement:

### 1. WebSocket Endpoint
```python
# FastAPI Example
@app.websocket("/api/v1/ws/driver/{driver_id}")
async def driver_websocket(
    websocket: WebSocket,
    driver_id: int,
    token: str = Query(...)
):
    # Verify token
    # Accept connection
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "location_update":
                # Save to database
                await save_driver_location(driver_id, data["data"])
            
            elif data["type"] == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        # Cleanup
        pass
```

### 2. Event Broadcasting
When admin assigns an order:
```python
# Backend sends to driver's WebSocket
await websocket.send_json({
    "type": "order_assigned",
    "data": {
        "order_id": 105,
        "restaurant_name": "Burger King",
        # ... other fields
    }
})
```

## Testing

1. **Local Development:**
   ```
   Backend: http://localhost:8000
   WebSocket: ws://localhost:8000
   
   Android Emulator: http://10.0.2.2:8000
   Physical Device: http://192.168.x.x:8000 (your PC's IP)
   ```

2. **Production:**
   ```
   Backend: https://api.khaogully.com
   WebSocket: wss://api.khaogully.com (SSL required!)
   ```

## Common Mistakes to Avoid

❌ **Don't create a middleware service** - React Native connects directly
❌ **Don't use HTTP polling** - WebSocket is much more efficient
❌ **Don't forget SSL in production** - `wss://` not `ws://`
❌ **Don't skip reconnection logic** - Mobile networks are unreliable
❌ **Don't send location too frequently** - 10-15 seconds is optimal

## Next Steps

1. ✅ WebSocket service created
2. ⏳ Install dependencies (`npm install expo-location @react-native-async-storage/async-storage`)
3. ⏳ Update HomeScreen to use WebSocket
4. ⏳ Implement backend WebSocket endpoint
5. ⏳ Test connection and location updates
6. ⏳ Add background location tracking (expo-task-manager)

## Questions?

- **Q: Can React Native handle this without Node.js backend?**
  - A: You still need a backend (FastAPI, Node, etc.) but React Native connects directly to it.

- **Q: Do I need Socket.io?**
  - A: No! Standard WebSocket works great. Socket.io adds extra complexity.

- **Q: What about background location?**
  - A: Use `expo-task-manager` for iOS/Android background location updates.

- **Q: How to handle battery drain?**
  - A: Update every 10-15s (not every second), use coarse accuracy when not actively delivering.
