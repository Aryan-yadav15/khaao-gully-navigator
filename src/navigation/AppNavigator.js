import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PooledOrdersScreen from '../screens/PooledOrdersScreen';
import DeliveryListScreen from '../screens/DeliveryListScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1A1A1A', // Dark header like reference
            elevation: 0, // Remove shadow for flat look
            shadowOpacity: 0,
          },
          headerTintColor: '#D4E157', // Lime green accent for back buttons/text
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
            color: '#fff', // White title
          },
          cardStyle: { backgroundColor: '#F8F9FA' } // Light grey background for screens
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        
        {/* Main Dashboard */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 
            title: 'KhaoGully~', // Branding style from image
            headerLeft: null,
            headerRight: () => (
              // Mock Cart/Notification Icon
              <React.Fragment>
                 {/* You would import View/Text/Icon here properly in a real scenario, 
                     but for Navigator config we keep it simple or use a custom header component.
                     For now, we just set the title style. */}
              </React.Fragment>
            )
          }}
        />

        {/* Pooled Orders Flow */}
        <Stack.Screen 
          name="PooledOrders" 
          component={PooledOrdersScreen}
          options={{ title: 'Restaurant Pickups' }}
        />

        {/* Delivery Flow */}
        <Stack.Screen 
          name="DeliveryList" 
          component={DeliveryListScreen}
          options={{ title: 'Customer Deliveries' }}
        />

        <Stack.Screen 
          name="OrderDetail" 
          component={OrderDetailScreen}
          options={{ title: 'Order Details' }}
        />

        {/* History & Earnings */}
        <Stack.Screen 
          name="OrderHistory" 
          component={OrderHistoryScreen}
          options={{ title: 'Order History' }}
        />

        <Stack.Screen 
          name="Earnings" 
          component={EarningsScreen}
          options={{ 
            title: 'Earnings',
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
          }}
        />

        {/* Profile */}
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

