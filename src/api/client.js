import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOST as ENV_API_HOST, API_KEY as ENV_API_KEY } from '@env';

// API URL from environment
const API_HOST = ENV_API_HOST || 'http://localhost:8000';
const API_KEY = ENV_API_KEY;

console.log('🔌 API Host:', API_HOST);
console.log('🔑 API Key configured:', API_KEY ? 'Yes' : 'No');

// Create Axios instance
const apiClient = axios.create({
  baseURL: `${API_HOST}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Request to ${config.url} with auth token`);
    } else {
      console.warn(`⚠️ Request to ${config.url} without auth token`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}: ${response.status}`);
    return response;
  },
  async (error) => {
    console.error(`❌ Response error from ${error.config?.url}:`, error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      console.log('🚪 Clearing auth tokens due to 401');
      await AsyncStorage.removeItem('driver_token');
      await AsyncStorage.removeItem('driver_data');
    }
    return Promise.reject(error);
  }
);

// ==================== HEALTH CHECK ====================

/**
 * Check if API is running
 */
export const checkAPIHealth = async () => {
  try {
    const response = await axios.get(`${API_HOST}`);
    console.log('✅ API is running:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ API not reachable:', error.message);
    return { success: false, message: error.message };
  }
};

// ==================== AUTH ====================

export const loginDriver = async (email, password) => {
  try {
    console.log('🔐 Login attempt to:', `${API_HOST}/api/v1/auth/driver/login`);
    console.log('📧 Identity:', email);
    
    const response = await apiClient.post('/auth/driver/login', {
      identity: email,
      password: password,
    });
    
    console.log('✅ Login response received:', response.status);
    console.log('📦 Response data:', response.data);
    
    // Backend returns: { access_token, refresh_token, expires_in, driver }
    const { access_token, refresh_token, driver } = response.data;
    
    if (!access_token || !driver) {
      throw new Error('Invalid response format from server');
    }
    
    // Store tokens and driver info
    await AsyncStorage.setItem('driver_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    await AsyncStorage.setItem('driver_data', JSON.stringify(driver));
    
    console.log('✅ Login successful, driver:', driver?.name || driver?.email);
    return { success: true, driver, token: access_token };
  } catch (error) {
    console.error('❌ Login failed:', error.response?.status, error.response?.data);
    return {
      success: false,
      message: error.response?.data?.detail || error.response?.data?.message || error.message || 'Login failed - check your credentials',
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

// ==================== POOLED ORDERS ====================

export const getActivePool = async () => {
  try {
    const response = await apiClient.get('/driver/active-pool');
    return response.data;
  } catch (error) {
    console.error('Error fetching active pool:', error);
    return { pool: null, restaurants: [] };
  }
};

export const markRestaurantPickupComplete = async (poolId, restaurantId) => {
  try {
    const response = await apiClient.patch(`/pools/${poolId}/pickup/${restaurantId}`, {
      status: 'collected',
      timestamp: new Date().toISOString(),
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to update pickup status' 
    };
  }
};

export const getPoolDeliveryOrders = async (poolId) => {
  try {
    const response = await apiClient.get(`/pools/${poolId}/delivery-orders`);
    return response.data.orders || [];
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    return [];
  }
};

// ==================== ORDER STATUS ====================

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    let endpoint = '';
    let method = 'post';
    let data = {};

    switch (newStatus) {
      case 'ACCEPTED':
        endpoint = `/driver/orders/${orderId}/accept`;
        data = { accepted: true };
        break;
      case 'PICKED_UP':
        endpoint = `/driver/orders/${orderId}/pickup`;
        data = { picked_up: true };
        break;
      case 'IN_TRANSIT':
        endpoint = `/driver/orders/${orderId}/in-transit`;
        break;
      case 'DELIVERED':
        // Note: Delivery usually requires OTP, handled by verifyOTP or separate call
        // If called without OTP, it might fail if backend enforces it
        endpoint = `/driver/orders/${orderId}/deliver`; 
        break;
      default:
        // Fallback for other statuses if any (or admin endpoints)
        // But since we don't have a generic patch endpoint for drivers, we warn
        console.warn(`No specific driver endpoint for status: ${newStatus}`);
        return { success: false, message: 'Invalid status update' };
    }

    const response = await apiClient.post(endpoint, data);
    return { success: true, order: response.data };
  } catch (error) {
    console.error(`Error updating status to ${newStatus}:`, error);
    return {
      success: false,
      message: error.response?.data?.detail || error.response?.data?.message || 'Failed to update status',
    };
  }
};

/**
 * Reject an order that was assigned (driver didn't respond in time)
 */
export const rejectOrder = async (orderId) => {
  try {
    const response = await apiClient.post(`/driver/orders/${orderId}/reject`);
    console.log('✅ Order rejected:', orderId);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Error rejecting order:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to reject order',
    };
  }
};

// ==================== LOCATION TRACKING ====================

/**
 * Update driver location
 * @deprecated Use WebSocketService instead
 */
export const updateDriverLocation = async (latitude, longitude, totalDistance = 0) => {
  console.warn('updateDriverLocation is deprecated. Use WebSocketService.');
  return { success: true };
};

// ==================== EARNINGS & REIMBURSEMENT ====================

/**
 * Submit earnings after completing an order
 * @param {string} orderId - Order UUID
 * @param {number} distanceKm - Distance traveled in kilometers
 * @param {string} poolId - Optional pool UUID if it was a pooled order
 */
export const submitOrderEarnings = async (orderId, distanceKm, poolId = null) => {
  try {
    const response = await apiClient.post('/driver/earnings', {
      order_uuid: orderId,
      pool_uuid: poolId,
      distance_km: distanceKm,
    });
    return { success: true, earnings: response.data };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to submit earnings' 
    };
  }
};

/**
 * Get daily earnings summary
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 */
export const getDailyEarnings = async (date = null) => {
  try {
    const params = {};
    if (date) params.date = date;
    
    const response = await apiClient.get('/driver/earnings/daily', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching daily earnings:', error);
    return null;
  }
};

/**
 * Get weekly earnings breakdown
 */
export const getWeeklyEarnings = async () => {
  try {
    const response = await apiClient.get('/driver/earnings/weekly');
    return response.data;
  } catch (error) {
    console.error('Error fetching weekly earnings:', error);
    return null;
  }
};

/**
 * Get monthly earnings summary
 */
export const getMonthlyEarnings = async (year = null, month = null) => {
  try {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await apiClient.get('/driver/earnings/monthly', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    return null;
  }
};

// ==================== OTP VERIFICATION (Phase 2) ====================

/**
 * Verify OTP entered by driver for delivery confirmation
 * @param {string} orderId - Order UUID
 * @param {string} otp - 4-digit OTP code
 */
export const verifyOTP = async (orderId, otp) => {
  try {
    const response = await apiClient.post('/orders/verify-otp', {
      order_uuid: orderId,
      otp: otp,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Invalid or expired OTP',
    };
  }
};

// ==================== ASSIGNED ORDERS ====================

export const getAssignedOrders = async (status = null) => {
  try {
    const params = { assigned_to_me: true };
    if (status) params.status = status;
    
    const response = await apiClient.get('/orders', { params });
    // Backend returns a direct list, not wrapped in { orders: [...] }
    return Array.isArray(response.data) ? response.data : (response.data.orders || []);
  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    return [];
  }
};

// ==================== DRIVER STATS ====================

/**
 * Get driver statistics (earnings, deliveries, distance)
 * Returns today, week, and month stats
 */
export const getDriverStats = async () => {
  try {
    const response = await apiClient.get('/drivers/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    return {
      today: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
      week: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
      month: { deliveries: 0, distance: 0, basePay: 0, distancePay: 0, bonus: 0, total: 0 },
      total_completed: 0,
      total_cancelled: 0,
      rating: 0
    };
  }
};

/**
 * Toggle driver online/offline status
 */
export const toggleOnlineStatus = async (isOnline) => {
  try {
    const response = await apiClient.post('/drivers/toggle-online', null, {
      params: { is_online: isOnline }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error toggling online status:', error);
    return { 
      success: false, 
      message: error.response?.data?.detail || 'Failed to update status' 
    };
  }
};

/**
 * Get driver profile
 */
export const getDriverProfile = async () => {
  try {
    const response = await apiClient.get('/drivers/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return null;
  }
};

// Export apiClient as both named and default
export { apiClient };
export default apiClient;
