# Backend Team - WebSocket Integration Requirements

## What We've Built (React Native Mobile App)

We have completed the **mobile driver app frontend** with full WebSocket support. The app is ready to:

1. ✅ Connect to backend WebSocket server
2. ✅ Send real-time location updates every 10 seconds
3. ✅ Receive and display new order assignments
4. ✅ Handle order cancellations
5. ✅ Auto-reconnect on network issues
6. ✅ Refresh authentication tokens automatically

## What We Need from Backend

### 1. WebSocket Endpoint Implementation

**Endpoint:** `/api/v1/ws/driver/{driver_id}`

**Connection URL Format:**
```
ws://your-backend-url.com/api/v1/ws/driver/123?token=JWT_ACCESS_TOKEN
```

**For Production:**
```
wss://api.khaogully.com/api/v1/ws/driver/123?token=JWT_ACCESS_TOKEN
```

### 2. Authentication

- Accept JWT access token as query parameter: `?token=YOUR_JWT_TOKEN`
- Verify token before accepting WebSocket connection
- If token is invalid/expired, close connection with code `4001`
- If driver is already connected elsewhere, close with code `4003`

### 3. Messages FROM Mobile App → Backend

#### Location Update (Every 10 seconds)
```json
{
  "type": "location_update",
  "data": {
    "latitude": 28.7041,
    "longitude": 77.1025,
    "accuracy": 10.5,
    "heading": 180.0,
    "speed": 25.5,
    "battery_level": 75,
    "timestamp": "2025-11-19T10:30:00Z"
  }
}
```

**What to do:** Save this to `driver_locations` table with timestamp

#### Heartbeat Ping
```json
{
  "type": "ping"
}
```

**What to do:** Respond with `{"type": "pong"}`

### 4. Messages FROM Backend → Mobile App

#### New Order Assigned
When admin assigns an order or pool system assigns a batch:

```json
{
  "type": "order_assigned",
  "data": {
    "order_id": 105,
    "restaurant_name": "Burger King",
    "pickup_address": "Koramangala 5th Block, Bangalore",
    "delivery_address": "Indiranagar 100ft Road, Bangalore",
    "earnings": 45.50,
    "distance_km": 3.2
  }
}
```

**When to send:** 
- Immediately when order is assigned to this driver
- When pool batch is created with this driver

#### Order Cancelled
```json
{
  "type": "order_cancelled",
  "data": {
    "order_id": 105,
    "reason": "Customer cancelled"
  }
}
```

**When to send:**
- When customer cancels order
- When admin cancels order
- When restaurant cancels order

### 5. Connection Lifecycle

```
1. Driver opens app → Not connected
2. Driver toggles "Online" → App connects WebSocket
3. Backend accepts connection → Sends confirmation
4. App starts sending location every 10s
5. Backend broadcasts order events to this driver
6. Driver toggles "Offline" → App disconnects gracefully
```

### 6. Error Handling Codes

| Close Code | Reason | Action Required |
|------------|--------|-----------------|
| `4001` | Authentication failed / Token expired | Mobile app will try to refresh token and reconnect |
| `4003` | Duplicate connection (logged in elsewhere) | Show alert to user, force logout |
| `1000` | Normal closure (driver went offline) | No action needed |

### 7. Database Schema Needed

#### `driver_locations` Table
```sql
CREATE TABLE driver_locations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT,
    heading FLOAT,
    speed FLOAT,
    battery_level INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_driver_created (driver_id, created_at)
);
```

### 8. REST API Endpoints Also Needed

These are for non-real-time operations:

```
POST   /api/v1/auth/login          - Login driver
POST   /api/v1/auth/refresh        - Refresh token
GET    /api/v1/driver/profile      - Get driver details
PUT    /api/v1/driver/status       - Update status (online/offline)
GET    /api/v1/orders/assigned     - Get assigned orders
PUT    /api/v1/orders/{id}/status  - Update order status
GET    /api/v1/earnings/today      - Get today's earnings
GET    /api/v1/earnings/history    - Get earnings history
```

## Technology Stack Choices

You can implement the backend using any of these:

### Option 1: FastAPI (Python) - RECOMMENDED
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

@app.websocket("/api/v1/ws/driver/{driver_id}")
async def driver_websocket(websocket: WebSocket, driver_id: int, token: str):
    # Verify token
    # Accept connection
    # Handle messages
```

**Pros:** Excellent WebSocket support, fast, easy to deploy

### Option 2: Node.js + Express + ws
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  // Handle connection
});
```

**Pros:** JavaScript ecosystem, lots of libraries

### Option 3: Django Channels (Python)
**Pros:** If already using Django

### Option 4: Go + Gorilla WebSocket
**Pros:** Extremely performant, good for scale

## Testing Setup

### Development Environment
```
Backend URL: http://10.0.2.2:8000 (Android Emulator)
WebSocket: ws://10.0.2.2:8000
Physical Device: ws://YOUR_PC_LOCAL_IP:8000
```

### Production Environment
```
Backend URL: https://api.khaogully.com
WebSocket: wss://api.khaogully.com (SSL required!)
```

## Security Requirements

1. ✅ Use WSS (WebSocket Secure) in production
2. ✅ Verify JWT tokens on every connection
3. ✅ Rate limit connections (prevent spam)
4. ✅ Log connection events for monitoring
5. ✅ Implement connection timeout (disconnect after 5 min no activity)

## Load Considerations

### Per Driver:
- 1 WebSocket connection (persistent)
- 6 location updates per minute (360/hour)
- ~1-5 order events per hour

### For 100 Drivers Online:
- 100 concurrent WebSocket connections
- 600 location updates per minute
- Database writes: ~10/second

**Recommendation:** Use connection pooling and bulk inserts for location data

## Testing Checklist

Before going live, please test:

- [ ] WebSocket connection accepts valid JWT
- [ ] Invalid token returns close code 4001
- [ ] Location updates are saved to database
- [ ] New order event reaches mobile app within 1 second
- [ ] Ping/pong keeps connection alive through load balancer
- [ ] Reconnection works after network disconnect
- [ ] SSL certificate works (wss:// in production)
- [ ] Multiple drivers can connect simultaneously
- [ ] Driver A receives only their orders (not B's orders)

## Sample Implementation (FastAPI)

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from typing import Dict
import json

app = FastAPI()

# Store active connections
active_connections: Dict[int, WebSocket] = {}

@app.websocket("/api/v1/ws/driver/{driver_id}")
async def driver_websocket(
    websocket: WebSocket,
    driver_id: int,
    token: str = Query(...)
):
    # 1. Verify JWT token
    if not verify_token(token, driver_id):
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    # 2. Check for duplicate connection
    if driver_id in active_connections:
        await active_connections[driver_id].close(code=4003, reason="Duplicate connection")
    
    # 3. Accept connection
    await websocket.accept()
    active_connections[driver_id] = websocket
    
    try:
        while True:
            # 4. Receive messages
            data = await websocket.receive_json()
            
            if data["type"] == "location_update":
                # Save to database
                await save_driver_location(driver_id, data["data"])
            
            elif data["type"] == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        # 5. Cleanup on disconnect
        del active_connections[driver_id]
        print(f"Driver {driver_id} disconnected")

# Function to broadcast order to specific driver
async def send_order_to_driver(driver_id: int, order_data: dict):
    if driver_id in active_connections:
        await active_connections[driver_id].send_json({
            "type": "order_assigned",
            "data": order_data
        })
```

## Questions to Answer

Please clarify:

1. **What platform are you using?** (Fleetbase, custom backend, etc.)
2. **Is WebSocket endpoint already implemented?** If yes, what's the URL?
3. **Do you have JWT authentication?** What's the token format?
4. **Database:** MySQL, PostgreSQL, MongoDB?
5. **Timeline:** When can WebSocket endpoint be ready?

## Our Configuration (.env file)

```env
# Currently set for local development
API_BASE_URL=http://10.0.2.2:8000
WS_BASE_URL=ws://10.0.2.2:8000

# Need production URLs from you
# API_BASE_URL=https://api.khaogully.com
# WS_BASE_URL=wss://api.khaogully.com
```

## Contact for Integration Testing

Once backend is ready:
1. Provide us the WebSocket URL
2. Provide test JWT token
3. We'll connect and test end-to-end
4. Fix any issues together
5. Go live!

---

**Mobile App Status:** ✅ Ready for integration
**Waiting for:** Backend WebSocket implementation + REST API endpoints
