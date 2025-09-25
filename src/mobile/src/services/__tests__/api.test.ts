import axios from 'axios';
import { api } from '../api';
import { LoginRequest, RegisterRequest } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        data: {
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
          }
        }
      };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.login(loginRequest);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/auth/login', loginRequest);
    });

    it('should register new user', async () => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const mockResponse = {
        data: {
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: '2',
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User'
          }
        }
      };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.register(registerRequest);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/auth/register', registerRequest);
    });

    it('should handle guest login', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'mock-guest-token',
          user: {
            id: 'guest-123',
            email: '',
            firstName: 'Misafir',
            lastName: 'Kullanıcı',
            isGuest: true
          }
        }
      };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.guestLogin();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/auth/guest-login');
    });
  });

  describe('Needs', () => {
    it('should create a new need', async () => {
      const needData = {
        title: 'iPhone 13 Pro arıyorum',
        description: 'Temiz durumda iPhone 13 Pro arıyorum',
        categoryId: 1,
        minBudget: 20000,
        maxBudget: 25000,
        urgency: 'Normal' as const,
        latitude: 41.0082,
        longitude: 28.9784,
        address: 'İstanbul, Türkiye'
      };

      const mockResponse = {
        data: {
          id: 1,
          ...needData,
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.createNeed(needData);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/needs', needData);
    });

    it('should get needs with filters', async () => {
      const filters = {
        page: 1,
        pageSize: 20,
        categoryId: 1
      };

      const mockResponse = {
        data: {
          items: [
            {
              id: 1,
              title: 'Test Need',
              description: 'Test Description',
              status: 'Active'
            }
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20
        }
      };

      mockedAxios.create().get.mockResolvedValue(mockResponse);

      const result = await api.getNeeds(filters);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith('/needs', { params: filters });
    });

    it('should get need by id', async () => {
      const needId = 1;
      const mockResponse = {
        data: {
          id: needId,
          title: 'Test Need',
          description: 'Test Description',
          status: 'Active'
        }
      };

      mockedAxios.create().get.mockResolvedValue(mockResponse);

      const result = await api.getNeedById(needId);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith(`/needs/${needId}`);
    });
  });

  describe('Offers', () => {
    it('should create a new offer', async () => {
      const offerData = {
        needId: 1,
        price: 22000,
        description: 'Sıfır kutusunda iPhone 13 Pro',
        deliveryDays: 1
      };

      const mockResponse = {
        data: {
          id: 1,
          ...offerData,
          status: 'Pending',
          createdAt: new Date().toISOString()
        }
      };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.createOffer(offerData);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/offers', offerData);
    });

    it('should get offers for a need', async () => {
      const needId = 1;
      const mockResponse = {
        data: {
          items: [
            {
              id: 1,
              needId: needId,
              price: 22000,
              description: 'Test offer',
              status: 'Pending'
            }
          ],
          totalCount: 1
        }
      };

      mockedAxios.create().get.mockResolvedValue(mockResponse);

      const result = await api.getOffersForNeed(needId);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith(`/offers/need/${needId}`);
    });

    it('should accept an offer', async () => {
      const offerId = 1;
      const mockResponse = { data: { success: true } };

      mockedAxios.create().post.mockResolvedValue(mockResponse);

      const result = await api.acceptOffer(offerId);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/offers/accept', { offerId });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            message: 'Bad Request'
          }
        }
      };

      mockedAxios.create().post.mockRejectedValue(errorResponse);

      await expect(api.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.create().get.mockRejectedValue(networkError);

      await expect(api.getNeeds({})).rejects.toThrow('Network Error');
    });
  });
});