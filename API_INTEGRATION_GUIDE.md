# 🔌 Fleetbase Console API Integration Guide

## Overview
This guide shows how to connect the Khaao Gully Navigator app to your Fleetbase console and integrate live tracking with real APIs.

---

## ✅ Live Tracking Integration - COMPLETE!

### What's Implemented:
1. **Location tracking starts** when driver begins restaurant pickups (PooledOrdersScreen)
2. **Continues tracking** throughout all deliveries (DeliveryListScreen)
3. **Shows real-time distance** in the delivery screen header
4. **Stops tracking** when all deliveries are completed
5. **Submits final distance** to API for earnings calculation

### How It Works:
```javascript
// Pickup Phase (PooledOrdersScreen)
useEffect(() => {
  startLocationTracking(); // Begins GPS tracking
  return () => stopLocationTracking(); // Cleanup if user goes back
}, []);

// Delivery Phase (DeliveryListScreen)
useEffect(() => {
  const interval = setInterval(() => {
    const distance = getTotalDistance(); // Gets cumulative distance
    setDistanceTraveled(distance); // Updates UI
  }, 5000); // Every 5 seconds
}, []);

// When all deliveries complete
const finalDistance = getTotalDistance();
stopLocationTracking();
submitOrderEarnings(orderId, finalDistance, poolId);
```

### Location Tracking Features:
- ✅ GPS updates every 5 seconds or 10 meters
- ✅ Haversine formula calculates accurate distance
- ✅ Filters out GPS errors (jumps > 1km)
- ✅ Sends location + distance to API
- ✅ Shows distance in real-time on screen

---

## 🔧 Console API Setup Steps

### Step 1: Get Your Fleetbase Console URL

**Option A: Hosted Fleetbase**
- If using Fleetbase cloud: `https://your-workspace.fleetbase.io`
- Contact Fleetbase for your specific URL

**Option B: Self-Hosted**
- If hosting yourself: `http://your-server-ip:8000`
- Or custom domain: `https://console.yourdomain.com`

**Option C: Local Development**
- For Android Emulator: `http://10.0.2.2:8000`
- For Physical Device: `http://YOUR_LOCAL_IP:8000` (find your IP with `ipconfig`)
- For iOS Simulator: `http://localhost:8000`

---

### Step 2: Update .env File

Edit `.env` in your project root:

```env
# Fleetbase Configuration
FLEETBASE_HOST=https://your-console.fleetbase.io
FLEETBASE_KEY=your_api_key_here

# For Android Emulator (development):
# FLEETBASE_HOST=http://10.0.2.2:8000

# For Physical Device (development):
# FLEETBASE_HOST=http://192.168.1.3:8000
```

**Get your API key from:**
- Fleetbase Console → Settings → API Keys
- Or create a new one for the driver app

---

### Step 3: Test Connection

Run this command in the app:
```bash
npm start
```

Check the console for:
```
🔌 Fleetbase API Host: https://your-console.fleetbase.io
```

---

## 📡 API Endpoints Used by the App

### Authentication
- `POST /api/v1/auth/login` - Driver login
- Stores token in AsyncStorage

### Live Location Tracking
- `POST /api/v1/driver/location` - Send GPS coordinates + distance
- Sent every 5 seconds during delivery
- Payload:
  ```json
  {
    "latitude": 28.7041,
    "longitude": 77.1025,
    "distance_km": 12.5,
    "timestamp": "2025-11-18T10:30:00Z"
  }
  ```

### Orders & Pools
- `GET /api/v1/driver/active-pool` - Get assigned pooled order
- `GET /api/v1/pools/{poolId}/delivery-orders` - Get customers for delivery
- `PATCH /api/v1/pools/{poolId}/pickup/{restaurantId}` - Mark restaurant collected
- `PATCH /api/v1/orders/{orderId}/status` - Update order status

### Earnings
- `POST /api/v1/driver/earnings` - Submit completed delivery earnings
  ```json
  {
    "order_uuid": "abc123",
    "pool_uuid": "def456",
    "distance_km": 12.5
  }
  ```
- `GET /api/v1/driver/earnings/daily` - Today's earnings summary
- `GET /api/v1/driver/earnings/weekly` - Week breakdown
- `GET /api/v1/driver/earnings/monthly` - Month summary

### OTP Verification (Phase 2)
- `POST /api/v1/orders/verify-otp` - Verify customer OTP
  ```json
  {
    "order_uuid": "abc123",
    "otp": "1234"
  }
  ```

---

## 🔌 Connecting Screens to Real APIs

### HomeScreen - Replace Mock Data

**Current (Mock):**
```javascript
const [stats, setStats] = useState({
  todayEarnings: 450,
  weekEarnings: 3200,
  monthEarnings: 12500,
});
```

**Replace with:**
```javascript
const [stats, setStats] = useState(null);

useEffect(() => {
  loadDashboard();
}, []);

const loadDashboard = async () => {
  try {
    const daily = await getDailyEarnings();
    const weekly = await getWeeklyEarnings();
    const monthly = await getMonthlyEarnings();
    
    setStats({
      todayEarnings: daily.total_earnings,
      weekEarnings: weekly.total_earnings,
      monthEarnings: monthly.total_earnings,
      todayDeliveries: daily.total_deliveries,
      weekDeliveries: weekly.total_deliveries,
      monthDeliveries: monthly.total_deliveries,
      todayDistance: daily.total_distance,
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
};
```

---

### PooledOrdersScreen - Replace Mock Data

**Current (Mock):**
```javascript
const [restaurants, setRestaurants] = useState([
  { id: '1', name: 'Pizza Palace', ... }
]);
```

**Replace with:**
```javascript
const [restaurants, setRestaurants] = useState([]);

useEffect(() => {
  loadActivePool();
}, []);

const loadActivePool = async () => {
  try {
    const data = await getActivePool();
    if (data.pool) {
      setRestaurants(data.restaurants);
    }
  } catch (error) {
    console.error('Error loading pool:', error);
  }
};

const toggleCollected = async (restaurantId) => {
  const result = await markRestaurantPickupComplete(poolId, restaurantId);
  if (result.success) {
    setRestaurants(prev => 
      prev.map(r => 
        r.id === restaurantId ? { ...r, collected: true } : r
      )
    );
  }
};
```

---

### DeliveryListScreen - Replace Mock Data

**Current (Mock):**
```javascript
const [customers, setCustomers] = useState([
  { id: '1', name: 'Rahul Sharma', ... }
]);
```

**Replace with:**
```javascript
const [customers, setCustomers] = useState([]);

useEffect(() => {
  loadDeliveryOrders();
}, []);

const loadDeliveryOrders = async () => {
  try {
    const poolId = route.params?.poolId;
    const orders = await getPoolDeliveryOrders(poolId);
    setCustomers(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
  }
};

const confirmDelivery = async (customerId) => {
  const result = await updateOrderStatus(customerId, 'delivered');
  if (result.success) {
    setCustomers(prev =>
      prev.map(c => c.id === customerId ? { ...c, delivered: true } : c)
    );
  }
};

const verifyOTPAndDeliver = async () => {
  const result = await verifyOTP(selectedCustomer.id, otpInput);
  if (result.success) {
    confirmDelivery(selectedCustomer.id);
    setShowOTPModal(false);
    Alert.alert('Success', 'Order delivered successfully!');
  } else {
    Alert.alert('Invalid OTP', result.message);
  }
};

const handleCompleteAllDeliveries = async () => {
  const finalDistance = getTotalDistance();
  stopLocationTracking();
  
  // Submit earnings to API
  const orderId = route.params?.orderId;
  const poolId = route.params?.poolId;
  const result = await submitOrderEarnings(orderId, finalDistance, poolId);
  
  if (result.success) {
    Alert.alert(
      'All Deliveries Complete!',
      `Earned: ₹${result.earnings.total_amount}\nDistance: ${finalDistance.toFixed(2)} km`,
      [
        { text: 'View Earnings', onPress: () => navigation.navigate('Earnings') },
        { text: 'Back to Home', onPress: () => navigation.navigate('Home') },
      ]
    );
  }
};
```

---

### EarningsScreen - Replace Mock Data

**Similar pattern:**
```javascript
const loadEarnings = async () => {
  let data;
  if (filter === 'Today') {
    data = await getDailyEarnings();
  } else if (filter === 'This Week') {
    data = await getWeeklyEarnings();
  } else {
    data = await getMonthlyEarnings();
  }
  setEarnings(data);
};
```

---

## 🧪 Testing the Integration

### Test 1: Login
```javascript
// LoginScreen.js
const result = await loginDriver(email, password);
if (result.success) {
  console.log('✅ Login successful', result.driver);
}
```

### Test 2: Location Tracking
```javascript
// Check console logs during delivery:
// 📍 Location updated: 28.704100, 77.102500
// 📏 Distance traveled: 2.45 km
// ✅ Location sent to API
```

### Test 3: API Calls
```javascript
// Check network tab in React Native Debugger
// Look for requests to your Fleetbase host
```

---

## 🐛 Troubleshooting

### Issue: "Network Error" or "Request Failed"

**Solution 1: Check Host URL**
```bash
# Test if console is reachable
curl https://your-console.fleetbase.io/api/v1/health
```

**Solution 2: Android Emulator**
```env
# Use 10.0.2.2 instead of localhost
FLEETBASE_HOST=http://10.0.2.2:8000
```

**Solution 3: Physical Device**
```bash
# Find your local IP (Windows)
ipconfig

# Then use that IP
FLEETBASE_HOST=http://192.168.1.3:8000
```

**Solution 4: CORS Issues**
- Make sure your Fleetbase console allows requests from mobile app
- Check Fleetbase CORS settings

---

### Issue: "401 Unauthorized"

**Solution:**
- Check API key in `.env`
- Generate new API key from Fleetbase console
- Make sure key has driver permissions

---

### Issue: Location Not Tracking

**Solution:**
```javascript
// Test permissions
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
console.log('Permission status:', status);
```

---

## 📊 Expected Data Flow

```
1. Driver Opens App
   ↓
2. Login → Store Token
   ↓
3. Home Dashboard → Fetch Earnings
   ↓
4. Accept Order → Start Tracking
   ↓
5. Pickup Screen → Send Location Every 5s
   ↓
6. Mark Restaurants → Update API
   ↓
7. Delivery Screen → Continue Tracking
   ↓
8. Complete Delivery → Submit Distance & Earnings
   ↓
9. View Earnings → Show Updated Data
```

---

## 🎯 Next Steps

1. **Update .env with your console URL**
2. **Test login with real credentials**
3. **Verify location tracking in console**
4. **Test full order flow end-to-end**
5. **Check earnings calculation**

---

## 🚀 Production Checklist

Before deploying:

- [ ] Update FLEETBASE_HOST with production URL
- [ ] Use HTTPS for production (not HTTP)
- [ ] Test on physical device, not just emulator
- [ ] Verify location permissions work
- [ ] Test with real orders from console
- [ ] Check earnings calculations
- [ ] Test OTP verification
- [ ] Enable error logging (Sentry, etc.)
- [ ] Test offline handling
- [ ] Verify token refresh logic

---

## 📞 Support

If you encounter issues:
1. Check console logs for errors
2. Verify .env configuration
3. Test API endpoints with Postman
4. Check Fleetbase console logs
5. Review network requests in debugger

---

**Status:** ✅ Live tracking fully integrated, ready for API connection!
