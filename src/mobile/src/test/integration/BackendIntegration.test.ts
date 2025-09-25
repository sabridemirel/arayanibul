import { apiService } from '../../services/api';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

// Mock react-native-fbsdk-next
jest.mock('react-native-fbsdk-next', () => ({
  LoginManager: {
    logInWithPermissions: jest.fn(),
  },
  AccessToken: {
    getCurrentAccessToken: jest.fn(),
  },
}));

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

describe('Backend Integration Tests', () => {
  const TEST_API_URL = 'http://localhost:5000/api';
  
  beforeAll(() => {
    // Configure API service for testing
    apiService.setBaseURL(TEST_API_URL);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      const testUser = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'Both' as const,
      };

      // Test registration
      const registerResponse = await authService.register(testUser);
      expect(registerResponse.success).toBe(true);
      expect(registerResponse.user).toBeDefined();
      expect(registerResponse.token).toBeDefined();

      // Verify token is stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        registerResponse.token
      );

      // Test login with same credentials
      const loginResponse = await authService.login(testUser.email, testUser.password);
      expect(loginResponse.success).toBe(true);
      expect(loginResponse.user?.email).toBe(testUser.email);
    });

    it('should handle authentication errors properly', async () => {
      // Test login with invalid credentials
      const loginResponse = await authService.login('invalid@email.com', 'wrongpassword');
      expect(loginResponse.success).toBe(false);
      expect(loginResponse.error).toBeDefined();
    });

    it('should refresh token when expired', async () => {
      // Mock stored refresh token
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'refresh_token') return Promise.resolve('mock_refresh_token');
        return Promise.resolve(null);
      });

      const refreshResult = await authService.refreshToken();
      expect(refreshResult).toBeDefined();
    });
  });

  describe('Need Management Flow', () => {
    let authToken: string;

    beforeEach(async () => {
      // Setup authenticated user
      const testUser = {
        email: `buyer${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'Buyer',
        userType: 'Buyer' as const,
      };

      const authResponse = await authService.register(testUser);
      authToken = authResponse.token!;
      apiService.setAuthToken(authToken);
    });

    it('should create, retrieve, and update need', async () => {
      const needData = {
        title: 'iPhone 13 Pro Arıyorum',
        description: 'Temiz durumda iPhone 13 Pro arıyorum',
        categoryId: 1,
        minBudget: 20000,
        maxBudget: 25000,
        urgency: 'Normal' as const,
        latitude: 41.0082,
        longitude: 28.9784,
        address: 'İstanbul, Türkiye',
      };

      // Create need
      const createdNeed = await apiService.createNeed(needData);
      expect(createdNeed.id).toBeDefined();
      expect(createdNeed.title).toBe(needData.title);
      expect(createdNeed.status).toBe('Active');

      // Retrieve need
      const retrievedNeed = await apiService.getNeedById(createdNeed.id);
      expect(retrievedNeed.id).toBe(createdNeed.id);
      expect(retrievedNeed.title).toBe(needData.title);

      // Update need
      const updateData = {
        title: 'iPhone 13 Pro Arıyorum - Güncellendi',
        description: needData.description,
        minBudget: 22000,
        maxBudget: 27000,
      };

      const updatedNeed = await apiService.updateNeed(createdNeed.id, updateData);
      expect(updatedNeed.title).toBe(updateData.title);
      expect(updatedNeed.minBudget).toBe(updateData.minBudget);
    });

    it('should search and filter needs', async () => {
      // Create multiple needs for testing
      const need1 = await apiService.createNeed({
        title: 'Laptop Arıyorum',
        description: 'Gaming laptop',
        categoryId: 1,
        minBudget: 15000,
        maxBudget: 20000,
        urgency: 'Normal' as const,
      });

      const need2 = await apiService.createNeed({
        title: 'Telefon Arıyorum',
        description: 'Android telefon',
        categoryId: 1,
        minBudget: 5000,
        maxBudget: 8000,
        urgency: 'Urgent' as const,
      });

      // Test search
      const searchResults = await apiService.getNeeds({ search: 'laptop' });
      expect(searchResults.some(need => need.id === need1.id)).toBe(true);
      expect(searchResults.some(need => need.id === need2.id)).toBe(false);

      // Test budget filter
      const budgetFilterResults = await apiService.getNeeds({
        minBudget: 10000,
        maxBudget: 25000,
      });
      expect(budgetFilterResults.some(need => need.id === need1.id)).toBe(true);
      expect(budgetFilterResults.some(need => need.id === need2.id)).toBe(false);

      // Test category filter
      const categoryFilterResults = await apiService.getNeeds({ categoryId: 1 });
      expect(categoryFilterResults.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Offer Management Flow', () => {
    let buyerToken: string;
    let providerToken: string;
    let needId: number;

    beforeEach(async () => {
      // Setup buyer
      const buyer = {
        email: `buyer${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'Buyer',
        userType: 'Buyer' as const,
      };
      const buyerAuth = await authService.register(buyer);
      buyerToken = buyerAuth.token!;

      // Setup provider
      const provider = {
        email: `provider${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'Provider',
        userType: 'Provider' as const,
      };
      const providerAuth = await authService.register(provider);
      providerToken = providerAuth.token!;

      // Create need as buyer
      apiService.setAuthToken(buyerToken);
      const need = await apiService.createNeed({
        title: 'Test Need for Offers',
        description: 'Test description',
        categoryId: 1,
        minBudget: 1000,
        maxBudget: 2000,
        urgency: 'Normal' as const,
      });
      needId = need.id;
    });

    it('should create offer and manage offer lifecycle', async () => {
      // Provider creates offer
      apiService.setAuthToken(providerToken);
      const offerData = {
        needId,
        price: 1500,
        description: 'High quality service',
        deliveryDays: 3,
      };

      const createdOffer = await apiService.createOffer(offerData);
      expect(createdOffer.id).toBeDefined();
      expect(createdOffer.price).toBe(offerData.price);
      expect(createdOffer.status).toBe('Pending');

      // Buyer views offers
      apiService.setAuthToken(buyerToken);
      const offers = await apiService.getOffersForNeed(needId);
      expect(offers.some(offer => offer.id === createdOffer.id)).toBe(true);

      // Buyer accepts offer
      await apiService.acceptOffer(createdOffer.id);

      // Verify offer status changed
      const updatedOffer = await apiService.getOfferById(createdOffer.id);
      expect(updatedOffer.status).toBe('Accepted');
    });
  });

  describe('Messaging Flow', () => {
    let buyerToken: string;
    let providerToken: string;
    let offerId: number;

    beforeEach(async () => {
      // Setup complete offer scenario
      const { buyer, provider, offer } = await setupCompleteOfferScenario();
      buyerToken = buyer.token;
      providerToken = provider.token;
      offerId = offer.id;
    });

    it('should send and receive messages', async () => {
      // Provider sends message
      apiService.setAuthToken(providerToken);
      const messageData = {
        offerId,
        content: 'Merhaba, detayları konuşalım',
        type: 'Text' as const,
      };

      const sentMessage = await apiService.sendMessage(messageData);
      expect(sentMessage.id).toBeDefined();
      expect(sentMessage.content).toBe(messageData.content);

      // Buyer retrieves conversation
      apiService.setAuthToken(buyerToken);
      const conversation = await apiService.getConversation(offerId);
      expect(conversation.length).toBe(1);
      expect(conversation[0].content).toBe(messageData.content);

      // Buyer replies
      const replyData = {
        offerId,
        content: 'Tabii, ne zaman müsaitsiniz?',
        type: 'Text' as const,
      };

      await apiService.sendMessage(replyData);

      // Provider retrieves updated conversation
      apiService.setAuthToken(providerToken);
      const updatedConversation = await apiService.getConversation(offerId);
      expect(updatedConversation.length).toBe(2);
    });
  });

  describe('File Upload Integration', () => {
    let authToken: string;
    let needId: number;

    beforeEach(async () => {
      // Setup authenticated user and need
      const testUser = {
        email: `user${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'Buyer' as const,
      };

      const authResponse = await authService.register(testUser);
      authToken = authResponse.token!;
      apiService.setAuthToken(authToken);

      const need = await apiService.createNeed({
        title: 'Need with Images',
        description: 'Test need for image upload',
        categoryId: 1,
        minBudget: 1000,
        maxBudget: 2000,
        urgency: 'Normal' as const,
      });
      needId = need.id;
    });

    it('should upload images for need', async () => {
      // Mock file data
      const mockFile = {
        uri: 'file://test-image.jpg',
        type: 'image/jpeg',
        name: 'test-image.jpg',
      };

      const uploadResult = await apiService.uploadNeedImage(needId, mockFile);
      expect(uploadResult.url).toBeDefined();
      expect(uploadResult.fileName).toBe('test-image.jpg');

      // Verify image was associated with need
      const updatedNeed = await apiService.getNeedById(needId);
      expect(updatedNeed.images.length).toBe(1);
      expect(updatedNeed.images[0].imageUrl).toBe(uploadResult.url);
    });
  });

  describe('Push Notification Integration', () => {
    let userToken: string;

    beforeEach(async () => {
      const testUser = {
        email: `user${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'Both' as const,
      };

      const authResponse = await authService.register(testUser);
      userToken = authResponse.token!;
      apiService.setAuthToken(userToken);
    });

    it('should register for push notifications', async () => {
      // Mock Expo push token
      const mockPushToken = 'ExponentPushToken[mock-token]';
      
      const result = await notificationService.registerForPushNotifications();
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should update notification settings', async () => {
      const settings = {
        enableNewOfferNotifications: true,
        enableMessageNotifications: false,
        enableOfferAcceptedNotifications: true,
      };

      await apiService.updateNotificationSettings(settings);

      const updatedSettings = await apiService.getNotificationSettings();
      expect(updatedSettings.enableNewOfferNotifications).toBe(true);
      expect(updatedSettings.enableMessageNotifications).toBe(false);
      expect(updatedSettings.enableOfferAcceptedNotifications).toBe(true);
    });
  });

  // Helper function to setup complete offer scenario
  async function setupCompleteOfferScenario() {
    // Create buyer
    const buyer = {
      email: `buyer${Date.now()}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Buyer',
      userType: 'Buyer' as const,
    };
    const buyerAuth = await authService.register(buyer);

    // Create provider
    const provider = {
      email: `provider${Date.now()}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Provider',
      userType: 'Provider' as const,
    };
    const providerAuth = await authService.register(provider);

    // Create need as buyer
    apiService.setAuthToken(buyerAuth.token!);
    const need = await apiService.createNeed({
      title: 'Test Need',
      description: 'Test description',
      categoryId: 1,
      minBudget: 1000,
      maxBudget: 2000,
      urgency: 'Normal' as const,
    });

    // Create offer as provider
    apiService.setAuthToken(providerAuth.token!);
    const offer = await apiService.createOffer({
      needId: need.id,
      price: 1500,
      description: 'Test offer',
      deliveryDays: 1,
    });

    return {
      buyer: { ...buyer, token: buyerAuth.token! },
      provider: { ...provider, token: providerAuth.token! },
      need,
      offer,
    };
  }
});