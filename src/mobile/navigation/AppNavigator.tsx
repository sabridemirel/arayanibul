import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Screens
import MainScreen from '../screens/MainScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import NeedDetailScreen from '../screens/NeedDetailScreen';
import CreateNeedScreen from '../screens/CreateNeedScreen';
import CreateOfferScreen from '../screens/CreateOfferScreen';
import MyNeedsScreen from '../screens/MyNeedsScreen';
import MyOffersScreen from '../screens/MyOffersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  NeedDetail: { needId: number };
  CreateNeed: undefined;
  CreateOffer: { needId: number };
  OfferDetail: { offerId: number };
  Chat: { offerId: number };
  Profile: { userId?: string };
  MyOffers: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Payment: { offerId: number };
  TransactionHistory: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  MyNeeds: undefined;
  Messages: undefined;
  Profile: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Stack Navigator
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={MainScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const MainNavigator: React.FC = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'MyNeeds':
              iconName = 'list';
              break;
            case 'Messages':
              iconName = 'message';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Ana Sayfa' }}
      />
      <MainTab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ tabBarLabel: 'Ara' }}
      />
      <MainTab.Screen 
        name="MyNeeds" 
        component={MyNeedsScreen}
        options={{ tabBarLabel: 'İhtiyaçlarım' }}
      />
      <MainTab.Screen 
        name="Messages" 
        component={ConversationsScreen}
        options={{ tabBarLabel: 'Mesajlar' }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil' }}
      />
    </MainTab.Navigator>
  );
};

// Root Navigator
interface AppNavigatorProps {
  isAuthenticated: boolean;
}

// Deep linking configuration
const linking = {
  prefixes: ['arayanibul://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Search: 'search',
          MyNeeds: 'my-needs',
          Messages: 'messages',
          Profile: 'profile',
        },
      },
      NeedDetail: 'need/:needId',
      CreateNeed: 'create-need',
      CreateOffer: 'create-offer/:needId',
      MyOffers: 'my-offers',
      Chat: 'chat/:offerId',
      Notifications: 'notifications',
      NotificationSettings: 'notification-settings',
      Payment: 'payment/:offerId',
      TransactionHistory: 'transaction-history',
    },
  },
};

const AppNavigator: React.FC<AppNavigatorProps> = ({ isAuthenticated }) => {
  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen name="NeedDetail" component={NeedDetailScreen} />
            <RootStack.Screen name="CreateNeed" component={CreateNeedScreen} />
            <RootStack.Screen name="CreateOffer" component={CreateOfferScreen} />
            <RootStack.Screen name="MyOffers" component={MyOffersScreen} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
            <RootStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <RootStack.Screen name="Payment" component={PaymentScreen} />
            <RootStack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;