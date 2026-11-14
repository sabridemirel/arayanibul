import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Token lives in secure storage (written by authService.saveAuthData). Do not import
// authService here: it imports this module.
import secureStorageService from './secureStorageService';
import biometricAuthService from './biometricAuthService';
import { toImageUrls } from './imageUrls';

// API URL: set EXPO_PUBLIC_API_URL (e.g. https://api.example.com/api) for any deployed build.
// Without it, fall back to the local Docker API (Android emulator reaches the host via 10.0.2.2).
const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api';
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Named export for services importing { api }
export { api };

// Request interceptor - Token'ı otomatik ekle
api.interceptors.request.use(
  async (config) => {
    const { accessToken: token } = await secureStorageService.getAuthTokens();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth-expired notifier: lets AuthContext reset its state when the token is rejected
type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

export const onAuthExpired = (listener: AuthExpiredListener) => {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
};

export const emitAuthExpired = () => {
  authExpiredListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.warn('Auth-expired listener failed:', error);
    }
  });
};

// 401 from these means wrong credentials (or a dead refresh token), not an expired access token
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/guest-login',
  '/auth/google-login',
  '/auth/facebook-login',
  '/auth/apple-login',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
];
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some(path => url.includes(path));

const clearStoredSession = async () => {
  await secureStorageService.clearAuthTokens();
  await AsyncStorage.removeItem('user');
};

// Refresh endpoint returns { accessToken, refreshToken, expiresAt }; also accept the AuthResponse shape
interface RefreshResponse {
  success?: boolean;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: unknown;
}

let refreshPromise: Promise<boolean> | null = null;

const performRefresh = async (): Promise<boolean> => {
  const { refreshToken } = await secureStorageService.getAuthTokens();
  if (!refreshToken) return false;
  try {
    // Plain axios (not `api`) so this request never goes through the 401 interceptor
    const { data } = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    const newToken = data?.accessToken ?? data?.token;
    if (data?.success === false || !newToken || !data.refreshToken) return false;
    // Rotation revokes the old refresh token, so always persist the new pair
    await secureStorageService.storeAuthTokens(newToken, data.refreshToken);
    if (data.user) await AsyncStorage.setItem('user', JSON.stringify(data.user));
    try {
      await biometricAuthService.updateBiometricToken(newToken);
    } catch {}
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) return false;
    // Network error / timeout: session state unknown, let the caller retry later
    throw error;
  }
};

/**
 * Exchanges the stored refresh token for a new token pair (single-flight: concurrent callers share one request).
 * Resolves true when a new session was stored, false when the session is no longer valid.
 * Rejects on network errors (the session may still be valid).
 */
export const refreshSession = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Response interceptor - 401: refresh the session once and retry, otherwise sign out
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const sentAuth = config?.headers?.Authorization;
    const canRefresh = !!config && !!sentAuth && !config._retry && !isAuthEndpoint(config.url);

    if (canRefresh) {
      config._retry = true;
      // Token already rotated by a concurrent refresh: just retry with the current one
      const { accessToken: currentToken } = await secureStorageService.getAuthTokens();
      let refreshed = !!currentToken && `Bearer ${currentToken}` !== sentAuth;
      if (!refreshed) {
        try {
          refreshed = await refreshSession();
        } catch {
          // Network failure while refreshing: keep the session, just fail this request
          return Promise.reject(error);
        }
      }
      if (refreshed) {
        const { accessToken } = await secureStorageService.getAuthTokens();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          return api(config);
        }
      }
    }

    await clearStoredSession();
    // Only a rejected token means the session expired
    if (sentAuth && !isAuthEndpoint(config?.url)) {
      emitAuthExpired();
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

export interface AppleLoginData {
  identityToken: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
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

export type NeedStatus =
  | 'PendingReview'
  | 'Rejected'
  | 'Active'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Expired';

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
  status: NeedStatus;
  // Moderation (set when status is Rejected / once approved)
  rejectionReason?: string | null;
  rejectionReasonText?: string | null;
  rejectionNote?: string | null;
  approvedAt?: string | null;
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

export type SortBy = 'CreatedAt' | 'Budget' | 'Urgency';

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
  sortBy?: SortBy;
  sortDescending?: boolean;
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

export type MessageType = 'Text' | 'Image' | 'Location';

// Mirrors the backend MessageDto. isSentByCurrentUser is false in hub broadcasts,
// so compare senderId with the current user's id instead.
export interface Message {
  id: number;
  offerId: number;
  senderId: string;
  senderName: string;
  senderProfileImage?: string | null;
  content: string;
  type: MessageType;
  attachmentUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  isSentByCurrentUser: boolean;
}

export interface SendMessageRequest {
  offerId: number;
  content: string;
  type?: MessageType;
  attachmentUrl?: string;
}

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

// Mirrors the backend ConversationDto.
export interface Conversation {
  offerId: number;
  needId: number;
  needTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfileImage?: string | null;
  lastMessage?: Message | null;
  unreadCount: number;
  lastActivity: string;
  offerPrice?: number | null;
  offerStatus: OfferStatus;
}

// API Services
export const authAPI = {
  register: (data: RegisterData): Promise<AuthResponse> =>
    api.post('/auth/register', data).then(res => res.data),
  
  login: (data: LoginData): Promise<AuthResponse> =>
    api.post('/auth/login', data).then(res => res.data),
  
  // Google ID token from the native Google Sign-In SDK
  googleLogin: (idToken: string): Promise<AuthResponse> =>
    api.post('/auth/google-login', { token: idToken }).then(res => res.data),

  // Classic Facebook access token from the native Facebook SDK
  facebookLogin: (accessToken: string): Promise<AuthResponse> =>
    api.post('/auth/facebook-login', { token: accessToken }).then(res => res.data),

  // Apple only sends the name on the very first sign-in, so pass it along when present
  appleLogin: (data: AppleLoginData): Promise<AuthResponse> =>
    api.post('/auth/apple-login', data).then(res => res.data),

  forgotPassword: (email: string): Promise<{ message: string }> =>
    api.post('/auth/forgot-password', { email }).then(res => res.data),

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

// The API returns flat DTOs (categoryName, userName, needTitle, providerName, ...).
// Screens read nested objects (need.category, need.user, offer.need, offer.provider),
// so map the flat fields into that shape in one place.
type Raw = Record<string, any>;

const splitName = (full: unknown) => {
  const parts = String(full ?? '').trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
};

export const normalizeNeed = (n: Raw): Need => {
  if (!n || typeof n !== 'object') return n as Need;
  return {
    ...n,
    images: toImageUrls(n.images),
    category: n.category ?? (n.categoryName
      ? { id: n.categoryId, name: n.categoryName, nameTr: n.categoryName }
      : undefined),
    user: n.user ?? (n.userName
      ? { id: n.userId, ...splitName(n.userName), profileImageUrl: n.userProfileImageUrl }
      : undefined),
  } as Need;
};

export const normalizeOffer = (o: Raw): Offer => {
  if (!o || typeof o !== 'object') return o as Offer;
  const provider = o.provider ?? (o.providerName
    ? {
        id: o.providerId,
        ...splitName(o.providerName),
        profileImageUrl: o.providerProfileImageUrl,
        rating: o.providerRating,
        reviewCount: o.providerReviewCount,
      }
    : undefined);
  return {
    ...o,
    images: toImageUrls(o.images),
    need: o.need ? normalizeNeed(o.need) : (o.needId ? { id: o.needId, title: o.needTitle } : undefined),
    provider,
    user: o.user ?? provider,
  } as unknown as Offer;
};

const normalizeList = <T>(data: unknown, fn: (x: Raw) => T): T[] => {
  const items = (data as { items?: unknown[] })?.items ?? data;
  return Array.isArray(items) ? items.map(x => fn(x as Raw)) : [];
};

export const needAPI = {
  createNeed: (data: CreateNeedRequest): Promise<Need> =>
    api.post('/need', data).then(res => normalizeNeed(res.data)),
  
  // Map filters to backend parameter names and unwrap paged response
  getNeeds: (filters: NeedFilters = {}): Promise<{ items: Need[]; totalCount: number }> => {
    const params: any = {
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
      sortBy: filters.sortBy,
      sortDescending: filters.sortDescending,
    };
    return api.get('/need', { params }).then(res => ({
      items: normalizeList(res.data, normalizeNeed),
      totalCount: res.data?.totalCount ?? res.data?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
    }));
  },
  
  getNeedById: (id: number): Promise<Need> =>
    api.get(`/need/${id}`).then(res => normalizeNeed(res.data)),
  
  getUserNeeds: (status?: string): Promise<Need[]> =>
    api.get('/need/my-needs', { params: { status } }).then(res => normalizeList(res.data, normalizeNeed)),
  
  updateNeed: (id: number, data: Partial<CreateNeedRequest>): Promise<Need> =>
    api.put(`/need/${id}`, data).then(res => normalizeNeed(res.data)),
  
  deleteNeed: (id: number): Promise<void> =>
    api.delete(`/need/${id}`).then(res => res.data),
};

export const offerAPI = {
  createOffer: (data: CreateOfferRequest): Promise<Offer> =>
    api.post('/offer', data).then(res => normalizeOffer(res.data)),
  
  getOffersForNeed: (needId: number): Promise<Offer[]> =>
    api.get(`/offer/need/${needId}`).then(res => normalizeList(res.data, normalizeOffer)),
  
  getMyOffers: (): Promise<Offer[]> =>
    api.get('/offer/provider').then(res => normalizeList(res.data, normalizeOffer)),
  
  acceptOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/accept`).then(res => res.data),
  
  rejectOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/reject`).then(res => res.data),

  withdrawOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/withdraw`).then(res => res.data),
  
  updateOffer: (id: number, data: Partial<CreateOfferRequest>): Promise<Offer> =>
    api.put(`/offer/${id}`, data).then(res => normalizeOffer(res.data)),

  getOfferById: (id: number): Promise<Offer> =>
    api.get(`/offer/${id}`).then(res => normalizeOffer(res.data)),
};

export const messageAPI = {
  sendMessage: (data: SendMessageRequest): Promise<Message> =>
    api.post('/message/send', { type: 'Text', ...data }).then(res => res.data),
  
  getConversation: (offerId: number): Promise<Message[]> =>
    api.get(`/message/conversation/${offerId}`).then(res => (Array.isArray(res.data) ? res.data : [])),
  
  getConversations: (): Promise<Conversation[]> =>
    api.get('/message/conversations').then(res => (Array.isArray(res.data) ? res.data : [])),
  
  markConversationRead: (offerId: number): Promise<void> =>
    api.post('/message/mark-conversation-read', { offerId }).then(() => undefined),

  getUnreadCount: (): Promise<number> =>
    api.get('/message/unread-count').then(res => {
      const val = res.data;
      if (typeof val === 'number') return val;
      return Number(val?.count ?? val?.unreadCount ?? 0) || 0;
    }),
};

export interface UserStats {
  needsCount: number;
  offersGivenCount: number;
  offersReceivedCount: number;
  completedTransactionsCount: number;
  totalSpent: number;
  totalEarned: number;
  averageRating: number;
  reviewCount: number;
  verificationBadges: number;
  memberSince: string;
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

  // Permanently deletes the signed-in user's account
  deleteAccount: (): Promise<{ message: string }> =>
    api.delete('/user/account').then(res => res.data),
};

export const searchAPI = {
  // Use backend quick search and return results array
  search: (query: string, filters: NeedFilters = {}): Promise<Need[]> => {
    const params: any = {
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
    api.get('/recommendation/popular').then(res => normalizeList(res.data?.popularNeeds || res.data?.needs || [], normalizeNeed)),
  
  getTrendingNeeds: (): Promise<Need[]> =>
    api.get('/recommendation/trending').then(res => normalizeList(res.data, normalizeNeed)),
  
  getLocationBasedRecommendations: (lat: number, lng: number, radius: number = 25): Promise<Need[]> =>
    api.get('/recommendation/location-based', { 
      params: { latitude: lat, longitude: lng, radiusKm: radius } 
    }).then(res => normalizeList(res.data?.nearbyNeeds || [], normalizeNeed)),
  
  getDiscoverRecommendations: (lat?: number, lng?: number): Promise<any> =>
    api.get('/recommendation/discover', { 
      params: lat && lng ? { lat, lng } : {} 
    }).then(res => res.data),
};

// Moderation: user-facing report and block
export type ReportTargetType = 'Need' | 'Message' | 'User';
export type ReportReason = 'Spam' | 'Inappropriate' | 'Fraud' | 'Harassment' | 'Other';

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
}

export interface BlockedUser {
  userId: string;
  fullName: string;
  blockedAt: string;
}

export const reportAPI = {
  createReport: (data: CreateReportRequest): Promise<{ message: string }> =>
    api.post('/reports', data).then(res => res.data),
};

export const blockAPI = {
  blockUser: (userId: string): Promise<{ message: string }> =>
    api.post(`/users/${encodeURIComponent(userId)}/block`).then(res => res.data),

  unblockUser: (userId: string): Promise<{ message: string }> =>
    api.delete(`/users/${encodeURIComponent(userId)}/block`).then(res => res.data),

  getBlockedUsers: (): Promise<BlockedUser[]> =>
    api.get('/users/blocked').then(res => (Array.isArray(res.data) ? res.data : [])),
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
  data?: any;
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
