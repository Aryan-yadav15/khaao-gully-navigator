# 🔧 Technical Implementation Guide
## Distance Tracking & Earnings System

---

## 📍 **GPS Distance Tracking**

### How It Works:

The app tracks the driver's location every 5 seconds (or when they move 10+ meters) and calculates the cumulative distance traveled using the Haversine formula.

### Implementation:

**File:** `src/utils/location.js`

```javascript
// Haversine formula calculates great-circle distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};
```

### Location Tracking Flow:

```
1. Driver starts delivery
   ↓
2. startLocationTracking() called
   ↓
3. Reset lastPosition and totalDistance to 0
   ↓
4. Every 5 seconds (or 10m movement):
   - Get current GPS coordinates
   - Calculate distance from last position
   - Add to cumulative totalDistance
   - Send to API: updateDriverLocation(lat, lng, totalDistance)
   ↓
5. Driver completes delivery
   ↓
6. Submit earnings: submitOrderEarnings(orderId, totalDistance)
   ↓
7. Reset distance: resetDistance()
```

### Error Filtering:

To avoid GPS errors/jumps:
```javascript
// Only count movements between 1 meter and 1 kilometer
if (distance > 0.001 && distance < 1) {
  totalDistance += distance;
}
```

### API Integration:

```javascript
// Location update sent to Fleetbase
export const updateDriverLocation = async (latitude, longitude, totalDistance) => {
  const response = await fleetbaseAPI.post('/driver/location', {
    latitude: latitude,
    longitude: longitude,
    distance_km: totalDistance, // Cumulative distance
    timestamp: new Date().toISOString(),
  });
};
```

---

## 💰 **Earnings Calculation System**

### Earnings Formula:

```
Total Earnings = Base Pay + Distance Pay + Bonus

Where:
- Base Pay = ₹50 per delivery
- Distance Pay = ₹10 per kilometer traveled
- Bonus = Performance bonus (optional)
```

### Example:

```
Pooled order with 45 deliveries, 12.3 km traveled:

Base Pay = 45 deliveries × ₹50 = ₹2,250
Distance Pay = 12.3 km × ₹10 = ₹123
Bonus = ₹0 (none for this order)

Total = ₹2,373
```

### API Flow:

#### 1. Submit Earnings After Delivery:

```javascript
// Called when driver completes all deliveries
const distance = getTotalDistance(); // e.g., 12.3 km

const result = await submitOrderEarnings(
  orderId: 'order-uuid-123',
  distanceKm: 12.3,
  poolId: 'pool-uuid-456' // optional
);

// Backend calculates:
// basePay = deliveryCount × 50 (in paise: 5000)
// distancePay = distance × 10 (in paise: 1000)
// total = basePay + distancePay
```

#### 2. Retrieve Earnings Summary:

```javascript
// Get today's earnings
const today = await getDailyEarnings();
// Returns:
{
  date: '2025-11-18',
  deliveries: 12,
  distance_km: 45.2,
  earnings: {
    base: 60000,      // ₹600 in paise
    distance: 45200,   // ₹452 in paise
    bonus: 0,
    total: 105200      // ₹1,052 in paise
  }
}

// Get weekly breakdown
const week = await getWeeklyEarnings();
// Returns array of daily summaries

// Get monthly summary
const month = await getMonthlyEarnings(2025, 11);
```

---

## 🗺️ **Google Maps Navigation**

### Implementation:

**File:** `src/utils/navigation.js`

```javascript
export const openGoogleMaps = (latitude, longitude, label) => {
  const scheme = Platform.select({
    ios: 'maps:0,0?q=',
    android: 'geo:0,0?q=',
  });
  
  const latLng = `${latitude},${longitude}`;
  const url = Platform.select({
    ios: `${scheme}${label}@${latLng}`,
    android: `${scheme}${latLng}(${label})`,
  });
  
  Linking.openURL(url);
};
```

### Platform Differences:

**Android:**
- Opens Google Maps app
- Falls back to web maps if app not installed
- URL: `geo:0,0?q=28.7041,77.1025(Restaurant Name)`

**iOS:**
- Opens Apple Maps by default
- Can detect and open Google Maps if installed
- URL: `maps:0,0?q=Restaurant Name@28.7041,77.1025`

### No API Key Required:

Using deep links (URL schemes) instead of Google Maps API:
- ✅ Free (no paid API key needed)
- ✅ Native app experience
- ✅ Works offline
- ❌ Cannot show route preview in-app
- ❌ Cannot customize map appearance

---

## 🔔 **OTP Verification (Phase 2)**

### Flow:

```
1. Order status changes to "out_for_delivery"
   ↓
2. Backend generates 4-digit OTP
   ↓
3. SMS sent to customer: "Your OTP: 1234"
   ↓
4. OTP stored in database:
   {
     order_uuid: '...',
     otp: '1234',
     expires_at: now() + 30 minutes
   }
   ↓
5. Driver arrives at customer location
   ↓
6. Customer shows OTP: "1234"
   ↓
7. Driver enters in app → OTP Modal
   ↓
8. App sends to API: verifyOTP(orderId, '1234')
   ↓
9. Backend validates:
   - Check if OTP exists for order
   - Check if not expired
   - Compare entered OTP with stored OTP
   ↓
10. If match:
    - Order status → "delivered"
    - Return success
    Else:
    - Return error "Invalid OTP"
```

### Backend Implementation (Laravel):

```php
// Generate OTP
public function generateOTP($orderId)
{
    $otp = rand(1000, 9999);
    
    DB::table('fleetbase_order_otps')->insert([
        'order_uuid' => $orderId,
        'otp' => $otp,
        'expires_at' => now()->addMinutes(30),
        'created_at' => now(),
    ]);
    
    // Send SMS via Twilio/SNS/Indian provider
    SMS::send($customerPhone, "Your KhaoGully OTP: $otp");
    
    return $otp;
}

// Verify OTP
public function verifyOTP(Request $request)
{
    $orderId = $request->input('order_uuid');
    $enteredOTP = $request->input('otp');
    
    $record = DB::table('fleetbase_order_otps')
        ->where('order_uuid', $orderId)
        ->where('expires_at', '>', now())
        ->orderBy('created_at', 'desc')
        ->first();
    
    if (!$record || $record->otp != $enteredOTP) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired OTP'
        ], 400);
    }
    
    // Update order status
    DB::table('fleetbase_orders')
        ->where('uuid', $orderId)
        ->update(['status' => 'delivered']);
    
    return response()->json(['success' => true]);
}
```

### SMS Providers (Choose One):

1. **Twilio** (International):
   - Easy to integrate
   - $0.0079 per SMS in India
   - https://www.twilio.com

2. **AWS SNS** (Amazon):
   - Scalable
   - $0.00645 per SMS in India
   - Requires AWS account

3. **Indian Providers:**
   - **MSG91:** https://msg91.com
   - **Gupshup:** https://www.gupshup.io
   - **2Factor:** https://2factor.in
   - Cheaper for Indian numbers
   - Better delivery rates in India

---

## 📊 **Database Schema (Phase 2)**

### Earnings Table:

```sql
CREATE TABLE fleetbase_driver_earnings (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  uuid CHAR(36) UNIQUE NOT NULL,
  driver_uuid CHAR(36) NOT NULL,
  order_uuid CHAR(36),
  pool_uuid CHAR(36),
  date DATE NOT NULL,
  
  -- Distance & Deliveries
  distance_km DECIMAL(10,2) DEFAULT 0,
  delivery_count INT DEFAULT 1,
  
  -- Earnings Breakdown (in paise)
  base_pay INT DEFAULT 0,
  distance_pay INT DEFAULT 0,
  bonus INT DEFAULT 0,
  total_earnings INT DEFAULT 0,
  
  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (driver_uuid) REFERENCES fleetbase_drivers(uuid),
  FOREIGN KEY (order_uuid) REFERENCES fleetbase_orders(uuid),
  INDEX(driver_uuid),
  INDEX(date)
);
```

### OTP Table:

```sql
CREATE TABLE fleetbase_order_otps (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_uuid CHAR(36) NOT NULL,
  otp CHAR(4) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_uuid) REFERENCES fleetbase_orders(uuid),
  INDEX(order_uuid),
  INDEX(expires_at)
);
```

---

## 🔧 **Environment Setup**

### For Development:

```env
# .env
FLEETBASE_HOST=http://10.0.2.2:8000      # Android emulator
FLEETBASE_SOCKET_HOST=http://10.0.2.2:38000
FLEETBASE_KEY=your_api_key_here
DEFAULT_COORDINATES=28.7041,77.1025
```

### For Physical Device Testing:

```env
# .env
FLEETBASE_HOST=http://192.168.1.100:8000  # Your computer's local IP
FLEETBASE_SOCKET_HOST=http://192.168.1.100:38000
```

**Find your local IP:**
- **Windows:** `ipconfig` → Look for IPv4 Address
- **Mac/Linux:** `ifconfig` → Look for inet address

### For Production:

```env
# .env.production
FLEETBASE_HOST=https://api.khaoogully.com
FLEETBASE_SOCKET_HOST=https://ws.khaoogully.com:38000
FLEETBASE_KEY=production_api_key_here
```

---

## 🚀 **Performance Optimization**

### Location Tracking:

**Current Settings:**
```javascript
{
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,      // 5 seconds
  distanceInterval: 10,    // 10 meters
}
```

**Battery-Saving Options:**
```javascript
{
  accuracy: Location.Accuracy.Balanced,  // Less battery
  timeInterval: 10000,                    // 10 seconds
  distanceInterval: 25,                   // 25 meters
}
```

### API Caching:

```javascript
// Cache earnings data to reduce API calls
const [earningsCache, setEarningsCache] = useState({
  data: null,
  timestamp: null,
});

const getDailyEarnings = async () => {
  const now = Date.now();
  const cacheAge = now - (earningsCache.timestamp || 0);
  
  // Use cache if less than 5 minutes old
  if (cacheAge < 300000 && earningsCache.data) {
    return earningsCache.data;
  }
  
  // Fetch fresh data
  const data = await api.getDailyEarnings();
  setEarningsCache({ data, timestamp: now });
  return data;
};
```

---

## 🐛 **Debugging Tips**

### Check Location Permissions:

```javascript
import * as Location from 'expo-location';

const checkPermissions = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  console.log('Location permission:', status);
  // Should be: 'granted'
};
```

### Monitor Distance Calculation:

```javascript
// In location.js
console.log(`📍 From: ${lastPosition.latitude}, ${lastPosition.longitude}`);
console.log(`📍 To: ${latitude}, ${longitude}`);
console.log(`📏 Distance: ${distance.toFixed(3)} km`);
console.log(`📊 Total: ${totalDistance.toFixed(2)} km`);
```

### Test API Calls:

```javascript
// Test endpoints manually
const testAPI = async () => {
  console.log('Testing submitOrderEarnings...');
  const result = await submitOrderEarnings('test-order-123', 5.5);
  console.log('Result:', result);
};
```

---

## 📱 **Testing Checklist**

### Before Launch:

- [ ] Test on physical device (not just emulator)
- [ ] Verify GPS tracking accuracy
- [ ] Test Google Maps navigation
- [ ] Verify phone dialer works
- [ ] Test with poor network (airplane mode toggle)
- [ ] Test location permission denied scenario
- [ ] Verify distance calculation with known route
- [ ] Test OTP modal UI
- [ ] Check all navigation flows
- [ ] Verify earnings calculations
- [ ] Test online/offline toggle
- [ ] Check battery usage during delivery

---

## 🎓 **Key Concepts**

### Why Haversine Formula?

- Calculates shortest distance over Earth's surface
- Accounts for Earth's curvature
- Accurate for distances up to ~100 km
- Simple to implement
- No external libraries needed

### Why Paise Instead of Rupees?

```javascript
// Bad: Floating point errors
const earnings = 12.50 + 3.75; // 16.249999999999998

// Good: Integer math
const earnings = 1250 + 375;   // 1625 paise = ₹16.25
```

### Why Foreground-Only Location?

- Better battery life
- User knows when being tracked
- Complies with most privacy laws
- Android 11+ restricts background location
- Simpler permission model

---

## 🔐 **Security Considerations**

### API Keys:

```javascript
// ❌ Never commit .env to git
// ✅ Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### Driver Authentication:

```javascript
// Store token securely
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('driver_token', token);

// Clear on logout
await AsyncStorage.removeItem('driver_token');
```

### OTP Validation:

```php
// Backend must:
1. Rate limit OTP attempts (max 3 wrong attempts)
2. Expire OTPs after 30 minutes
3. Use cryptographically secure random (not predictable)
4. Log all verification attempts
```

---

## 📚 **Further Reading**

- [Haversine Formula Explained](https://en.wikipedia.org/wiki/Haversine_formula)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Navigation Guide](https://reactnavigation.org/)
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/)
- [Google Maps URL Schemes](https://developers.google.com/maps/documentation/urls/)

---

**Last Updated:** November 18, 2025  
**Author:** GitHub Copilot  
**Version:** 1.0.0
