# Visual Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE DRIVER APP                        │
│                   (React Native - DONE ✅)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • WebSocket Client (auto-connect)                         │
│  • Location Tracker (GPS every 10s)                        │
│  • Order Notifications                                      │
│  • Online/Offline Toggle                                    │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WebSocket Connection
                       │ ws://backend-url/api/v1/ws/driver/123
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                           │
│                 (NEEDS TO BE BUILT ⏳)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WebSocket Server:                                          │
│  • Accept driver connections                                │
│  • Receive location updates                                 │
│  • Broadcast order events                                   │
│  • Handle authentication                                    │
│                                                             │
│  REST API:                                                  │
│  • /auth/login - Driver login                              │
│  • /orders/assigned - Get orders                           │
│  • /earnings/today - Get earnings                          │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  • driver_locations (GPS data)                             │
│  • orders (order info)                                      │
│  • drivers (driver details)                                │
│  • earnings (payment data)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Driver Goes Online
```
Mobile App                    Backend
    |                            |
    |---(1) Connect WebSocket--->|
    |    ws://.../driver/123     |
    |                            |
    |<--(2) Connection OK--------|
    |                            |
    |---(3) Location Update----->|
    |    Every 10 seconds        |---> Save to DB
    |                            |
```

### 2. New Order Assignment
```
Admin/System                Mobile App                Backend
     |                           |                       |
     |--Assign Order to Driver-->|                       |
     |                           |                       |
     |                           |<--Order Notification--|
     |                           |  (via WebSocket)      |
     |                           |                       |
     |                           |---Show Popup 🎉       |
```

### 3. Location Tracking Flow
```
Mobile App              Backend              Database
    |                      |                     |
    |--Location Update---->|                     |
    |  {lat, lng, etc}     |                     |
    |                      |--INSERT------------>|
    |                      |  driver_locations   |
    |                      |                     |
    |<---Acknowledgment----|                     |
```

## Message Flow Examples

### App → Backend

**Every 10 seconds:**
```json
{
  "type": "location_update",
  "data": {
    "latitude": 28.7041,
    "longitude": 77.1025,
    "accuracy": 10.5,
    "heading": 180.0,
    "speed": 25.5,
    "battery_level": 75
  }
}
```

### Backend → App

**When order assigned:**
```json
{
  "type": "order_assigned",
  "data": {
    "order_id": 105,
    "restaurant_name": "Burger King",
    "pickup_address": "Koramangala",
    "delivery_address": "Indiranagar",
    "earnings": 45.50,
    "distance_km": 3.2
  }
}
```

**When order cancelled:**
```json
{
  "type": "order_cancelled",
  "data": {
    "order_id": 105,
    "reason": "Customer cancelled"
  }
}
```

## WebSocket Connection States

```
[DISCONNECTED] 
      ↓
   Driver taps "Online"
      ↓
[CONNECTING...] 
      ↓
   Token verified
      ↓
[CONNECTED ✅] ← Now receiving orders & sending location
      ↓
   Driver taps "Offline"
      ↓
[DISCONNECTED]
```

## Complete User Journey

```
┌──────────────────────────────────────────────────────────┐
│ 1. Driver opens app → Sees "Offline" status             │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Driver toggles "Online"                               │
│    → App requests location permission                    │
│    → App connects to WebSocket                           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Status changes to "🟢 Online & Connected"            │
│    → App starts sending GPS every 10 seconds            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 4. Admin assigns order                                   │
│    → Backend broadcasts to driver's WebSocket            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Driver sees popup: "🎉 New Order Assigned!"          │
│    → Shows order details (pickup, delivery, earnings)    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 6. Driver accepts & completes delivery                   │
│    → App continues sending location during delivery      │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 7. Driver toggles "Offline" when done                    │
│    → App disconnects WebSocket gracefully                │
└──────────────────────────────────────────────────────────┘
```

## What's Done vs What's Needed

### ✅ DONE (Mobile App)
- [x] WebSocket client implementation
- [x] Auto-reconnection logic
- [x] Location tracking (10s intervals)
- [x] Order notification UI
- [x] Online/Offline toggle
- [x] Token refresh handling
- [x] Error handling

### ⏳ NEEDED (Backend)
- [ ] WebSocket server endpoint
- [ ] Accept `/api/v1/ws/driver/{id}` connections
- [ ] Receive & save location updates
- [ ] Broadcast order events to drivers
- [ ] JWT authentication verification
- [ ] Database tables (driver_locations, orders)
- [ ] REST API endpoints

## Technology Recommendations

### If starting from scratch:
```
Backend:  FastAPI (Python) or Express.js (Node.js)
Database: PostgreSQL or MySQL
Cache:    Redis (for active connections)
Deploy:   AWS/GCP/Azure with SSL certificate
```

### If using Fleetbase:
Check if Fleetbase has built-in WebSocket support.
If not, you may need to build a small microservice alongside it.

---

**Bottom Line:** Mobile app is ready. Need backend WebSocket server to connect to!
