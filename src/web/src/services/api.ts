import axios from 'axios';

// API Base URL - Production veya development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://13.62.223.188:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Named export for services importing { api }
export { api };

// Request interceptor - Token'i otomatik ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Token suresi dolmussa temizle
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Types
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SocialLoginData {
  provider: string;
  accessToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  isGuest: boolean;
  profileImageUrl?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Category {
  id: number;
  name: string;
  nameTr: string;
  description?: string;
  iconUrl?: string;
  parentCategoryId?: number;
  isActive: boolean;
  sortOrder: number;
  subCategories?: Category[];
}

export interface Need {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  minBudget?: number;
  maxBudget?: number;
  currency: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  urgency: 'Flexible' | 'Normal' | 'Urgent';
  status: 'Active' | 'InProgress' | 'Completed' | 'Cancelled' | 'Expired';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  userId: string;
  user?: User;
  category?: Category;
  images?: string[];
  offerCount?: number;
}

export interface CreateNeedRequest {
  title: string;
  description: string;
  categoryId: number;
  minBudget?: number;
  maxBudget?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  urgency: 'Flexible' | 'Normal' | 'Urgent';
  images?: string[];
}

export interface NeedFilters {
  categoryId?: number;
  minBudget?: number;
  maxBudget?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  urgency?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Offer {
  id: number;
  needId: number;
  providerId: string;
  price: number;
  currency: string;
  description: string;
  deliveryDays: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
  createdAt: string;
  updatedAt: string;
  provider?: User;
  need?: Need;
  images?: string[];
}

export interface CreateOfferRequest {
  needId: number;
  price: number;
  description: string;
  deliveryDays: number;
  images?: string[];
}

export interface Message {
  id: number;
  offerId: number;
  senderId: string;
  content: string;
  type: 'Text' | 'Image' | 'Location';
  attachmentUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface SendMessageRequest {
  offerId: number;
  content: string;
  type: 'Text' | 'Image' | 'Location';
  attachmentUrl?: string;
}

export interface Conversation {
  offerId: number;
  offer?: Offer;
  lastMessage?: Message;
  unreadCount: number;
  otherUser?: User;
}

// API Services
export const authAPI = {
  register: (data: RegisterData): Promise<AuthResponse> =>
    api.post('/auth/register', data).then(res => res.data),

  login: (data: LoginData): Promise<AuthResponse> =>
    api.post('/auth/login', data).then(res => res.data),

  // Map generic social login to backend-specific endpoints
  socialLogin: (data: SocialLoginData): Promise<AuthResponse> => {
    const provider = data.provider.toLowerCase();
    if (provider.includes('google')) {
      return api.post('/auth/google-login', { token: data.accessToken }).then(res => res.data);
    }
    if (provider.includes('facebook')) {
      return api.post('/auth/facebook-login', { token: data.accessToken }).then(res => res.data);
    }
    return Promise.reject(new Error('Unsupported social provider'));
  },

  guestLogin: (): Promise<AuthResponse> =>
    api.post('/auth/guest-login').then(res => res.data),

  convertGuestToUser: (data: RegisterData): Promise<AuthResponse> =>
    api.post('/auth/convert-guest', data).then(res => res.data),

  // Backend exposes current user under /api/User/profile
  getCurrentUser: (): Promise<User> =>
    api.get('/user/profile').then(res => res.data),
};

export const categoryAPI = {
  // Backend route is singular controller name
  getCategories: (): Promise<Category[]> =>
    api.get('/category').then(res => res.data),

  getSubCategories: (parentId: number): Promise<Category[]> =>
    api.get(`/category/${parentId}/subcategories`).then(res => res.data),
};

export const needAPI = {
  createNeed: (data: CreateNeedRequest): Promise<Need> =>
    api.post('/need', data).then(res => res.data),

  // Map filters to backend parameter names and unwrap paged response
  getNeeds: (filters: NeedFilters = {}): Promise<Need[]> => {
    const params: Record<string, unknown> = {
      categoryId: filters.categoryId,
      minBudget: filters.minBudget,
      maxBudget: filters.maxBudget,
      latitude: filters.latitude,
      longitude: filters.longitude,
      radiusKm: filters.radius,
      urgency: filters.urgency,
      searchText: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
    };
    return api.get('/need', { params }).then(res => res.data?.items || res.data);
  },

  getNeedById: (id: number): Promise<Need> =>
    api.get(`/need/${id}`).then(res => res.data),

  getUserNeeds: (status?: string): Promise<Need[]> =>
    api.get('/need/my-needs', { params: { status } }).then(res => res.data?.items || res.data),

  updateNeed: (id: number, data: Partial<CreateNeedRequest>): Promise<Need> =>
    api.put(`/need/${id}`, data).then(res => res.data),

  deleteNeed: (id: number): Promise<void> =>
    api.delete(`/need/${id}`).then(res => res.data),
};

export const offerAPI = {
  createOffer: (data: CreateOfferRequest): Promise<Offer> =>
    api.post('/offer', data).then(res => res.data),

  getOffersForNeed: (needId: number): Promise<Offer[]> =>
    api.get(`/offer/need/${needId}`).then(res => res.data?.items || res.data),

  getMyOffers: (): Promise<Offer[]> =>
    api.get('/offer/provider').then(res => res.data?.items || res.data),

  acceptOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/accept`).then(res => res.data),

  rejectOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/reject`).then(res => res.data),

  updateOffer: (id: number, data: Partial<CreateOfferRequest>): Promise<Offer> =>
    api.put(`/offer/${id}`, data).then(res => res.data),
};

export const messageAPI = {
  sendMessage: (data: SendMessageRequest): Promise<Message> =>
    api.post('/message/send', data).then(res => res.data),

  getConversation: (offerId: number): Promise<Message[]> =>
    api.get(`/message/conversation/${offerId}`).then(res => res.data),

  getConversations: (): Promise<Conversation[]> =>
    api.get('/message/conversations').then(res => res.data),

  markAsRead: (messageId: number): Promise<void> =>
    api.post('/message/mark-read', { messageId }).then(res => res.data),
};

export interface UserStats {
  needsCount: number;
  offersGivenCount: number;
  offersReceivedCount: number;
  completedTransactionsCount: number;
  averageRating: number;
  totalReviews: number;
}

export interface Transaction {
  id: number;
  needTitle: string;
  amount: number;
  currency: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  transactionDate: string;
  type: 'Payment' | 'Refund';
  offerId: number;
  needId: number;
}

export interface TransactionFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const userAPI = {
  updateProfile: (data: Partial<User>): Promise<User> =>
    api.put('/user/profile', data).then(res => res.data),

  uploadProfileImage: (imageData: FormData): Promise<{ imageUrl: string }> =>
    api.post('/user/profile/image', imageData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),

  getUserStats: (): Promise<UserStats> =>
    api.get('/user/stats').then(res => res.data),

  getTransactionHistory: (filters: TransactionFilters = {}): Promise<Transaction[]> =>
    api.get('/user/transactions', { params: filters }).then(res => res.data?.items || res.data),
};

export const searchAPI = {
  // Use backend quick search and return results array
  search: (query: string, filters: NeedFilters = {}): Promise<Need[]> => {
    const params: Record<string, unknown> = {
      q: query,
      page: filters.page,
      pageSize: filters.pageSize,
      lat: filters.latitude,
      lng: filters.longitude,
      radius: filters.radius,
    };
    return api.get('/search/quick', { params }).then(res => res.data?.results || res.data?.items || res.data || []);
  },

  getRecommendations: (): Promise<Need[]> =>
    api.get('/recommendation/quick').then(res => res.data),

  getPopularNeeds: (): Promise<Need[]> =>
    api.get('/recommendation/popular').then(res => res.data?.popularNeeds || res.data?.needs || []),

  getTrendingNeeds: (): Promise<Need[]> =>
    api.get('/recommendation/trending').then(res => res.data),

  getLocationBasedRecommendations: (lat: number, lng: number, radius: number = 25): Promise<Need[]> =>
    api.get('/recommendation/location-based', {
      params: { latitude: lat, longitude: lng, radiusKm: radius }
    }).then(res => res.data?.nearbyNeeds || []),

  getDiscoverRecommendations: (lat?: number, lng?: number): Promise<unknown> =>
    api.get('/recommendation/discover', {
      params: lat && lng ? { lat, lng } : {}
    }).then(res => res.data),
};

export interface NotificationSettings {
  newOffers: boolean;
  offerAccepted: boolean;
  offerRejected: boolean;
  newMessages: boolean;
  needExpiring: boolean;
  marketingEmails: boolean;
}

export interface NotificationItem {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  createdAt: string;
}

export const notificationAPI = {
  registerToken: (token: string, platform: string): Promise<void> =>
    api.post('/notification/device-token', { token, platform }).then(res => res.data),

  getNotifications: (page: number = 1, pageSize: number = 20): Promise<NotificationItem[]> =>
    api.get('/notification', { params: { page, pageSize } }).then(res => res.data),

  markAsRead: (notificationId: number): Promise<void> =>
    api.put(`/notification/${notificationId}/read`).then(res => res.data),

  markAllAsRead: (): Promise<void> =>
    api.put('/notification/read-all').then(res => res.data),

  getSettings: (): Promise<NotificationSettings> =>
    api.get('/notification/preferences').then(res => res.data),

  updateSettings: (settings: Partial<NotificationSettings>): Promise<NotificationSettings> =>
    api.put('/notification/preferences', settings).then(res => res.data),

  deleteNotification: (notificationId: number): Promise<void> =>
    api.delete(`/notification/${notificationId}`).then(res => res.data),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get('/notification/unread-count').then(res => {
      const val = res.data;
      return typeof val === 'number' ? { count: val } : (val || { count: 0 });
    }),
};

export interface Review {
  id: number;
  reviewerId: string;
  reviewerName: string;
  reviewerProfileImage?: string;
  revieweeId: string;
  revieweeName: string;
  offerId?: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
}

export interface CreateReviewRequest {
  revieweeId: string;
  offerId?: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment?: string;
}

export interface UserRating {
  userId: string;
  averageRating: number;
  totalReviews: number;
  recentReviews: Review[];
}

export interface ReviewFilters {
  userId?: string;
  rating?: number;
  offerId?: number;
  isVisible?: boolean;
  page?: number;
  pageSize?: number;
}

export const reviewAPI = {
  createReview: (data: CreateReviewRequest): Promise<Review> =>
    api.post('/review', data).then(res => res.data),

  getReviewById: (id: number): Promise<Review> =>
    api.get(`/review/${id}`).then(res => res.data),

  getReviews: (filters: ReviewFilters = {}): Promise<Review[]> =>
    api.get('/review', { params: filters }).then(res => res.data),

  getUserReviews: (userId: string, asReviewer: boolean = false): Promise<Review[]> =>
    api.get(`/review/user/${userId}`, { params: { asReviewer } }).then(res => res.data),

  getUserRating: (userId: string): Promise<UserRating> =>
    api.get(`/review/user/${userId}/rating`).then(res => res.data),

  getMyReviews: (): Promise<Review[]> =>
    api.get('/review/my-reviews').then(res => res.data),

  getReceivedReviews: (): Promise<Review[]> =>
    api.get('/review/received-reviews').then(res => res.data),

  updateReview: (id: number, data: UpdateReviewRequest): Promise<Review> =>
    api.put(`/review/${id}`, data).then(res => res.data),

  deleteReview: (id: number): Promise<void> =>
    api.delete(`/review/${id}`).then(res => res.data),

  canReview: (revieweeId: string, offerId?: number): Promise<boolean> =>
    api.get('/review/can-review', { params: { revieweeId, offerId } }).then(res => res.data),
};

export default api;
