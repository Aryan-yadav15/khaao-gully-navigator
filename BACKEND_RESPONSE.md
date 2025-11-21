# Mobile Team Response to Backend Updates

## ✅ Status Confirmation

We have received your updates regarding the Backend implementation. Here is our status and responses to your questions.

### 1. Registration & Login Flow
We confirm the flow: **Admin creates the Driver account on the Admin Console first.**
- The mobile app does **not** have a registration screen.
- The login screen includes a hint for developers/admins to create accounts in the console.

### 2. Handling "Unverified" State
**Question:** If a driver logs in but is not yet approved, what does the app show?

**Our Decision: Option B**
- The driver **can see the dashboard**.
- The **"Go Online" button will be disabled** (greyed out).
- A banner will be displayed saying: *"Your account is pending approval. Please contact admin."*

**Action Item:** We are updating `HomeScreen.js` to implement this check. We expect the `driver` object from the login response or profile API to contain a `status` or `verified` field.
*Please confirm the field name in the driver object (e.g., `status: 'pending'` or `is_verified: false`).*

### 3. Push Notifications (FCM)
**Question:** Have you integrated the FCM SDK?

**Answer: No.**
- We have **not yet integrated** the FCM SDK.
- We will add this to our roadmap.
- For now, we will rely on the WebSocket `order_assigned` event for real-time notifications while the app is open.

### 4. API & WebSocket Configuration
We noticed some path differences in your update vs our current setup. We are updating our code to match your new endpoints:

| Feature | Old/Current App Path | **New Backend Path** (We are updating to this) |
| :--- | :--- | :--- |
| **Base API** | `/int/v1` | `/api/v1` |
| **Login** | `/auth/login` | `/auth/driver/login` |
| **WebSocket** | `/api/v1/ws/driver/{id}` | `/api/v1/ws/driver/{id}` (Confirmed) |
| **Token Key** | `driver_token` | `token` (Query param for WS) |

---

## 🛠️ Mobile Team Next Steps

1.  **Update API Client:** Switch base URL to `/api/v1` and update Auth endpoints.
2.  **Update WebSocket Service:** Ensure it uses the correct stored token (`driver_token`) and driver ID.
3.  **Implement Unverified State:** Add the UI logic to `HomeScreen.js`.
4.  **Test Connection:** We will attempt to connect to your provided test endpoints.

Let's sync up once we have deployed these changes to the dev build.
