# 🔧 Fleetbase API Connection Fix

## ✅ Fixed!

**Issue:** API endpoint was using wrong base URL

**Changes Made:**
1. Updated API baseURL: `${API_HOST}/int/v1` (Fleetbase internal API)
2. Added health check function: `checkAPIHealth()`
3. Updated location tracking to use `fleetbase_tracking_statuses` table
4. Added proper tracking payload with subject_uuid and subject_type

**Verified Working:**
- API check: http://localhost:8000 → Returns `{"message":"Fleetbase API","version":"v1","fleetbase":"0.7.17"}`
- Tracking table: `fleetbase_tracking_statuses` ✅

---

## 🧪 Testing Fleetbase Connection

### Option 1: Test via Browser (Quickest)
1. Open http://localhost:8000
2. Should see:
   ```json
   {
     "message": "Fleetbase API",
     "version": "v1",
     "fleetbase": "0.7.17"
   }
   ```
3. ✅ If you see this, Fleetbase is running!

### Option 2: Test Console
1. Open http://localhost:4200

---

## 📱 Test App Login

### Step 1: Create Driver Account in Console
1. Go to http://localhost:4200
2. Navigate to: **Fleet → Drivers**
3. Click "New Driver"
4. Fill in details:
   - Name: Test Driver
   - Email: driver@test.com
   - Password: password123
   - Phone: +91 9876543210
5. Save

### Step 2: Test in Mobile App
1. Make sure app is running: `npm start`
2. Press `a` to open Android Emulator
3. Enter credentials:
   - Email: driver@test.com
   - Password: password123
4. Check console logs for:
   ```
   🔌 Fleetbase API Host: http://10.0.2.2:8000
   🔑 API Key configured: Yes
   ✅ Login successful
   ```

---

## 🔍 Debugging Connection Issues

### Check 1: Is Fleetbase Running?
```bash
# Open these URLs in browser:
# Console: http://localhost:4200 (should show login page)
# API: http://localhost:8000 (might show Fleetbase info or blank)
```

### Check 2: Check Docker Status (if using Docker)
```bash
docker ps
# Should see containers for:
# - fleetbase-app
# - fleetbase-api
# - mysql
# - redis
```

### Check 3: Check Fleetbase Logs
Look for any errors in your Fleetbase console or terminal where it's running.

### Check 4: Test from Emulator
The emulator uses `10.0.2.2` to access your host machine's `localhost`.

Test if it can reach your API:
```bash
# Inside emulator's browser or adb shell:
curl http://10.0.2.2:8000
curl http://10.0.2.2:4200
```

---

## 🎯 Expected Behavior

### On App Start:
```
🔌 Fleetbase API Host: http://10.0.2.2:8000
🔑 API Key configured: Yes
```

### On Login Attempt:
```javascript
// Console logs:
POST http://10.0.2.2:8000/~api/v1/auth/login
{
  "identity": "driver@test.com",
  "password": "password123"
}

// Response (success):
{
  "token": "eyJ0eXAiOiJKV1QiLCJh...",
  "driver": {
    "id": "driver_123",
    "name": "Test Driver",
    "email": "driver@test.com"
  }
}
```

### On Location Update:
```javascript
POST http://10.0.2.2:8000/int/v1/tracking/update
{
  "subject_uuid": "driver_123",
  "subject_type": "driver",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "altitude": 0,
  "speed": 0,
  "heading": 0,
  "distance": 2450,
  "timestamp": "2025-11-18T10:30:00Z"
}

// Saves to: fleetbase_tracking_statuses table
```

---

## ⚠️ Common Issues

### Issue: "Network Error"
**Cause:** Fleetbase not running or wrong URL  
**Fix:** 
- Check http://localhost:4200 works in your browser
- Restart Fleetbase services
- Check firewall isn't blocking port 8000

### Issue: "401 Unauthorized"
**Cause:** Invalid API key or token  
**Fix:**
- Get valid API key from Fleetbase Console → Settings → API Keys
- Update `.env` with new key
- Restart app: `npm start -- --clear`

### Issue: "404 Not Found"
**Cause:** Wrong endpoint path  
**Fix:** ✅ Already fixed! Now using `/int/v1` for internal APIs

### Issue: "Connection Refused"
**Cause:** Emulator can't reach host  
**Fix:**
- Make sure using `10.0.2.2` not `localhost`
- Check `.env` has correct config
- Restart emulator

---

## ✅ Verification Checklist

- [ ] Fleetbase Console loads at http://localhost:4200
- [ ] Can login to console with admin credentials
- [ ] Created test driver account in console
- [ ] App shows: "🔌 Fleetbase API Host: http://10.0.2.2:8000"
- [ ] Can login to app with driver credentials
- [ ] Console logs show successful API connection

---

## 🚀 Next Steps After Connection Works

1. **Test Live Tracking:**
   - Create test order in console
   - Assign to driver
   - Accept in app
   - Watch location update in console's live map

2. **Test Full Flow:**
   - Restaurant pickups
   - Customer deliveries
   - Distance tracking
   - Earnings submission

3. **Monitor Data:**
   - phpMyAdmin: http://localhost:8082
   - Redis: http://localhost:8081
   - Console dashboard: http://localhost:4200

---

**Status:** ✅ API endpoint fixed! Now using correct Fleetbase paths:
- Health check: `http://localhost:8000`
- Internal APIs: `/int/v1`
- Tracking table: `fleetbase_tracking_statuses`
