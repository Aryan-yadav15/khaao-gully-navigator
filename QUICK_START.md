# 🚀 Quick Start Guide - Khaao Gully Navigator

## ⚡ Run the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Run on physical device
# 1. Install Expo Go from Play Store/App Store
# 2. Scan QR code from terminal
# 3. Update .env with your computer's local IP
```

---

## 📱 Test the App Flow

### 1. Login (Mock)
- Email: any@email.com
- Password: any password
- Tap Login → Goes to Dashboard

### 2. Dashboard
- Toggle Online/Offline switch
- See mock earnings: ₹450 today
- Tap "View Pooled Orders"

### 3. Restaurant Pickups
- See 5 restaurants with order counts
- Tap "Navigate" → Opens Google Maps
- Tap "Mark Collected" to check off
- Once all collected → Tap "Proceed to Delivery"

### 4. Customer Deliveries
- See 3 customers sorted by distance
- Tap "Navigate" → Opens Google Maps
- Tap "Call" → Opens phone dialer
- Tap "✓ OTP" → Enter mock OTP (any 4 digits)
- Repeat for all customers
- Tap "Finish & View Earnings"

### 5. Earnings
- Switch tabs: Today / Week / Month
- See breakdown: Base Pay + Distance Pay
- View fuel reimbursement calculation

### 6. Order History
- Filter by date range
- See past deliveries with earnings

### 7. Profile
- View driver info
- Tap "Emergency SOS" → Opens dialer
- Tap "Logout" → Returns to login

---

## 🗂️ Files You Created

### Screens (7 new):
```
src/screens/
├── HomeScreen.js ✅ Enhanced dashboard
├── PooledOrdersScreen.js ✅ Restaurant checklist
├── DeliveryListScreen.js ✅ Customer deliveries
├── OrderHistoryScreen.js ✅ Past orders
├── EarningsScreen.js ✅ Earnings breakdown
├── ProfileScreen.js ✅ Driver profile
└── OrderDetailScreen.js (existing)
```

### Components (1 new):
```
src/components/
└── IncomingOrderModal.js ✅ Order notification popup
```

### Utils (1 updated):
```
src/utils/
└── location.js ✅ Added distance tracking
```

### API (1 updated):
```
src/api/
└── fleetbase.js ✅ Added earnings endpoints
```

### Navigation (1 updated):
```
src/navigation/
└── AppNavigator.js ✅ All screens connected
```

---

## 🔌 Connect to Real API (Phase 2)

### Step 1: Update Environment
```env
# .env
FLEETBASE_HOST=http://YOUR_IP:8000
FLEETBASE_KEY=your_real_api_key
```

### Step 2: Replace Mock Data

**Example - HomeScreen.js:**
```javascript
// BEFORE (Mock):
const [stats, setStats] = useState({
  todayEarnings: 450,
  todayDeliveries: 12,
  todayDistance: 45.2,
});

// AFTER (Real API):
import { getDailyEarnings } from '../api/fleetbase';

useEffect(() => {
  const fetchData = async () => {
    const earnings = await getDailyEarnings();
    setStats({
      todayEarnings: earnings.earnings.total / 100, // Convert paise to rupees
      todayDeliveries: earnings.deliveries,
      todayDistance: earnings.distance_km,
    });
  };
  fetchData();
}, []);
```

### Step 3: Test Each Screen
- [ ] Login with real credentials
- [ ] Fetch real pooled orders
- [ ] Update pickup status
- [ ] Fetch delivery customers
- [ ] Submit real OTP
- [ ] Calculate real distance
- [ ] Submit earnings
- [ ] View real order history

---

## 🐛 Common Issues

### "Location permission denied"
```javascript
// Go to device settings:
// Settings > Apps > Expo Go > Permissions > Location > Allow
```

### "Cannot connect to API"
```bash
# Check Fleetbase is running:
docker-compose ps

# Verify you can access from browser:
http://YOUR_IP:8000

# Update .env with correct IP:
# Windows: ipconfig
# Mac/Linux: ifconfig
```

### "Navigation doesn't work"
```javascript
// Make sure all screens are imported in AppNavigator.js
// Check screen names match exactly (case-sensitive)
```

### "Mock data doesn't show"
```javascript
// Check useState is initialized correctly
// Verify component is rendering (add console.log)
console.log('Stats:', stats);
```

---

## 📊 Mock Data Reference

### Earnings:
- Today: ₹1,052 (12 deliveries, 45.2 km)
- Week: ₹4,208 (45 deliveries, 165.8 km)
- Month: ₹16,705 (180 deliveries, 650.5 km)

### Restaurants:
1. Pizza Palace - 8 orders, 1.2 km
2. Burger Kingdom - 12 orders, 2.5 km
3. Chinese Wok - 6 orders, 3.8 km
4. South Indian Express - 10 orders, 4.2 km
5. Tandoori Nights - 9 orders, 5.1 km

### Customers:
1. Rahul Sharma - Room 405, Hostel A, 0.3 km
2. Priya Patel - Room 203, Hostel B, 0.5 km
3. Amit Kumar - Room 101, Hostel C, 0.7 km

### Driver:
- Name: Rajesh Kumar
- Phone: +91 98765 43210
- Vehicle: DL 01 AB 1234 (Motorcycle)
- Rating: 4.8 stars

---

## 🎨 Color Palette

```javascript
Primary: '#2196F3'   // Blue (navigation, pooled orders)
Success: '#4CAF50'   // Green (earnings, completed)
Warning: '#FF9800'   // Orange (deliveries, active)
Danger: '#FF5722'    // Red (SOS, logout)
Background: '#f5f5f5' // Light gray
Text: '#333'         // Dark gray
```

---

## 📞 Navigation Functions

### Open Google Maps:
```javascript
import { openGoogleMaps } from '../utils/navigation';

openGoogleMaps(28.7041, 77.1025, 'Restaurant Name');
```

### Call Phone Number:
```javascript
import { Linking } from 'react-native';

Linking.openURL('tel:+919876543210');
```

---

## 📏 Distance Tracking

### Start Tracking:
```javascript
import { startLocationTracking } from '../utils/location';

// When driver starts delivery
startLocationTracking();
```

### Get Distance:
```javascript
import { getTotalDistance } from '../utils/location';

// When driver completes delivery
const distance = getTotalDistance(); // in km
console.log(`Traveled: ${distance.toFixed(2)} km`);
```

### Reset Counter:
```javascript
import { resetDistance } from '../utils/location';

// After submitting earnings
resetDistance();
```

---

## 💰 Earnings Submission

```javascript
import { submitOrderEarnings, getTotalDistance } from '../api/fleetbase';

// After completing all deliveries
const handleComplete = async () => {
  const distance = getTotalDistance();
  
  const result = await submitOrderEarnings(
    orderId,      // 'order-uuid-123'
    distance,     // 12.3
    poolId        // 'pool-uuid-456' (optional)
  );
  
  if (result.success) {
    console.log('Earned:', result.earnings);
    resetDistance();
  }
};
```

---

## 🔔 OTP Verification (Phase 2)

```javascript
import { verifyOTP } from '../api/fleetbase';

const handleVerifyOTP = async (orderId, otp) => {
  const result = await verifyOTP(orderId, otp);
  
  if (result.success) {
    Alert.alert('Success', 'Order delivered!');
    // Update UI, submit earnings, etc.
  } else {
    Alert.alert('Error', 'Invalid OTP');
  }
};
```

---

## 📦 Deployment Checklist

### Before Building APK:

- [ ] Update app.json with production details
- [ ] Create .env.production with production API
- [ ] Test on physical device
- [ ] Remove console.log statements
- [ ] Add error boundaries
- [ ] Test offline scenarios
- [ ] Optimize images
- [ ] Enable ProGuard (Android)
- [ ] Add app icon & splash screen
- [ ] Generate signed APK
- [ ] Test release build

### Build Commands:

```bash
# Android APK
eas build --platform android --profile production

# iOS IPA (requires Apple Developer account)
eas build --platform ios --profile production

# Install Expo Application Services (EAS)
npm install -g eas-cli
eas login
eas build:configure
```

---

## 🎯 Success Metrics

### UI Completeness:
- ✅ 7 complete screens
- ✅ 1 reusable modal
- ✅ Full navigation flow
- ✅ Realistic mock data
- ✅ All interactions working

### Technical Features:
- ✅ Distance tracking (Haversine)
- ✅ Location updates every 5s
- ✅ Google Maps integration
- ✅ Phone dialer integration
- ✅ Earnings calculation
- ✅ API client ready

### User Experience:
- ✅ Smooth animations
- ✅ Intuitive navigation
- ✅ Clear visual feedback
- ✅ Error handling (alerts)
- ✅ Loading states (pull-to-refresh)

---

## 📞 Support

**Issues?** Check:
1. `BUILD_COMPLETE.md` - Full feature documentation
2. `TECHNICAL_GUIDE.md` - Implementation details
3. `initialPlan.md` - Original requirements

**Questions?** Debug with:
```bash
# Check console logs
npx expo start

# Clear cache
npx expo start -c

# Check device logs (Android)
adb logcat

# Check device logs (iOS)
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "Expo"'
```

---

## 🎉 You're Ready!

**Everything is built and working with mock data.**  
**Next step: Connect to real Fleetbase API when backend is ready.**

**Happy coding! 🚀**
