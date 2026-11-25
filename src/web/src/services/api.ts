import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// API Base URL - Production veya development
// Production için: VITE_API_URL environment variable kullanılır
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  authExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('[auth] auth-expired listener failed', err);
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
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((path) => url.includes(path));

const clearStoredSession = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Stores a session returned by login/register/guest/social/convert-guest (or a refresh)
export const storeSession = (token: string, refreshToken?: string | null, user?: unknown) => {
  localStorage.setItem('authToken', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    // A stale refresh token from an earlier session must not be used for this one
    localStorage.removeItem('refreshToken');
  }
  if (user) localStorage.setItem('user', JSON.stringify(user));
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
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    // Plain axios (not `api`) so this request never goes through the 401 interceptor
    const { data } = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    const newToken = data?.accessToken ?? data?.token;
    if (data?.success === false || !newToken) return false;
    storeSession(newToken, data.refreshToken, data.user);
    return true;
  } catch (err) {
    // Only 400/401 mean the refresh token was rejected. Anything else (rate limit, 5xx while the
    // API restarts) says nothing about the session, so keep it and let the caller retry later.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 400 || status === 401) {
      // Another tab may have rotated the token meanwhile (rotation revokes ours): use its session
      const current = localStorage.getItem('refreshToken');
      return !!current && current !== refreshToken && !!localStorage.getItem('authToken');
    }
    // Network error / timeout: session state unknown, let the caller retry later
    throw err;
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
      const currentToken = localStorage.getItem('authToken');
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
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
      }
    }

    clearStoredSession();
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

export interface SocialLoginData {
  provider: string;
  accessToken: string;
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
  roles?: string[];
  isAdmin?: boolean;
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
  | 'Active'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'
  | 'Rejected';

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
  /** End of the "Acil İlanlar" showcase slot (urgent needs only) */
  urgentUntil?: string;
  status: NeedStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  /** Turkish label for rejectionReason */
  rejectionReasonText?: string;
  rejectionNote?: string;
  userId: string;
  user?: User;
  category?: Category;
  images?: NeedImage[];
  offerCount?: number;
}

export interface NeedImage {
  id: number;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
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
  urgency: number; // 1=Flexible, 2=Normal, 3=Urgent
  images?: string[];
}

/** One-tap question suggested for a recognised category (condition, warranty...) */
export interface NeedDraftQuestion {
  label: string;
  options: string[];
  selected?: string | null;
}

/** Listing fields the server suggests from one line of free text */
export interface NeedDraft {
  title: string;
  description: string;
  categoryId?: number | null;
  categoryName?: string | null;
  parentCategoryName?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  address?: string | null;
  questions: NeedDraftQuestion[];
}

export interface UpdateNeedRequest {
  title?: string;
  description?: string;
  categoryId?: number;
  minBudget?: number;
  maxBudget?: number;
  address?: string;
  urgency?: number; // 1=Flexible, 2=Normal, 3=Urgent
  expiresAt?: string;
  /** Full, ordered list of image URLs; replaces the need's images */
  imageUrls?: string[];
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
  sortBy?: string;
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

// Mirrors backend MessageDto. isSentByCurrentUser is false in SignalR broadcasts,
// so compare senderId with the current user's id instead.
export interface Message {
  id: number;
  offerId: number;
  senderId: string;
  senderName: string;
  senderProfileImage?: string;
  content: string;
  type: MessageType;
  attachmentUrl?: string;
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

// Mirrors backend ConversationDto
export interface Conversation {
  offerId: number;
  needId: number;
  needTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfileImage?: string;
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: string;
  offerPrice?: number;
  offerStatus: Offer['status'];
}

/** Server-provided error text ({ message } or a plain string body), if any */
export const getApiErrorMessage = (err: unknown): string | undefined => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }
  return undefined;
};

export const getApiErrorStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

/** Turns relative upload paths (/uploads/...) into absolute URLs on the API host */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

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

  // Always resolves with a generic message (does not reveal whether the email exists)
  forgotPassword: (email: string): Promise<{ message: string }> =>
    api.post('/auth/forgot-password', { email }).then(res => res.data),

  resetPassword: (data: { email: string; token: string; newPassword: string }): Promise<{ message: string }> =>
    api.post('/auth/reset-password', data).then(res => res.data),
};

export const categoryAPI = {
  // Backend route is singular controller name
  getCategories: (): Promise<Category[]> =>
    api.get('/category').then(res => res.data),

  getSubCategories: (parentId: number): Promise<Category[]> =>
    api.get(`/category/${parentId}/subcategories`).then(res => res.data),
};

// The API returns flat DTOs (categoryName, userName, needTitle, providerName, ...).
// Pages read nested objects (need.category, need.user, offer.need, offer.provider),
// so map the flat fields into that shape in one place.
type Raw = Record<string, unknown>;

const splitName = (full: unknown) => {
  const parts = String(full ?? '').trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
};

export const normalizeNeed = (n: Raw): Need => {
  if (!n || typeof n !== 'object') return n as unknown as Need;
  return {
    ...n,
    category: n.category ?? (n.categoryName
      ? { id: n.categoryId, name: n.categoryName, nameTr: n.categoryName }
      : undefined),
    user: n.user ?? (n.userName
      ? { id: n.userId, ...splitName(n.userName), profileImageUrl: n.userProfileImageUrl }
      : undefined),
  } as unknown as Need;
};

const normalizeOffer = (o: Raw): Offer => {
  if (!o || typeof o !== 'object') return o as unknown as Offer;
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
    need: o.need ? normalizeNeed(o.need as Raw) : (o.needId ? { id: o.needId, title: o.needTitle } : undefined),
    provider,
    user: o.user ?? provider,
    currencyCode: o.currencyCode ?? o.currency,
  } as unknown as Offer;
};

const normalizeList = <T>(data: unknown, fn: (x: Raw) => T): T[] => {
  const items = (data as { items?: unknown[] })?.items ?? data;
  return Array.isArray(items) ? items.map(x => fn(x as Raw)) : [];
};

export const needAPI = {
  createNeed: (data: CreateNeedRequest): Promise<Need> =>
    api.post('/need', data).then(res => normalizeNeed(res.data)),

  /** Suggests title, category, budget and location from one line of text; saves nothing. */
  buildDraft: (text: string): Promise<NeedDraft> =>
    api.post('/need/draft', { text }).then(res => res.data),

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
    return api.get('/need', { params }).then(res => normalizeList(res.data, normalizeNeed));
  },

  getNeedById: (id: number): Promise<Need> =>
    api.get(`/need/${id}`).then(res => normalizeNeed(res.data)),

  getUserNeeds: (status?: string): Promise<Need[]> =>
    api.get('/need/my-needs', { params: { status } }).then(res => normalizeList(res.data, normalizeNeed)),

  updateNeed: (id: number, data: UpdateNeedRequest): Promise<Need> =>
    api.put(`/need/${id}`, data).then(res => normalizeNeed(res.data)),

  /** Uploads image files to a need (multipart, field "images"); resolves with the stored URLs */
  uploadNeedImages: (id: number, files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post(`/need/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then(res => res.data);
  },

  deleteNeedImage: (id: number, imageId: number): Promise<void> =>
    api.delete(`/need/${id}/images/${imageId}`).then(res => res.data),

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

  /** The signed-in seller's latest offer on a need, or null (API answers 204) */
  getMyOfferForNeed: (needId: number): Promise<Offer | null> =>
    api.get(`/offer/need/${needId}/mine`).then(res => (res.status === 204 || !res.data ? null : normalizeOffer(res.data))),

  acceptOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/accept`).then(res => res.data),

  rejectOffer: (offerId: number): Promise<void> =>
    api.post(`/offer/${offerId}/reject`).then(res => res.data),

  updateOffer: (id: number, data: Partial<CreateOfferRequest>): Promise<Offer> =>
    api.put(`/offer/${id}`, data).then(res => normalizeOffer(res.data)),

  getOfferById: (id: number): Promise<Offer> =>
    api.get(`/offer/${id}`).then(res => normalizeOffer(res.data)),

  withdrawOffer: (offerId: number): Promise<{ message: string }> =>
    api.post(`/offer/${offerId}/withdraw`).then(res => res.data),
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

  markAsRead: (messageId: number): Promise<void> =>
    api.post('/message/mark-read', { messageId }).then(res => res.data),
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

  deleteAccount: (): Promise<{ message: string }> =>
    api.delete('/user/account').then(res => res.data),
};

export const searchAPI = {
  // Use /need endpoint with full filter support
  search: (query: string, filters: NeedFilters = {}): Promise<{ items: Need[]; totalCount: number }> => {
    const params: Record<string, unknown> = {
      searchText: query || undefined,
      categoryId: filters.categoryId,
      minBudget: filters.minBudget,
      maxBudget: filters.maxBudget,
      urgency: filters.urgency,
      latitude: filters.latitude,
      longitude: filters.longitude,
      radiusKm: filters.radius,
      sortBy: filters.sortBy,
      sortDescending: filters.sortDescending,
      page: filters.page || 1,
      pageSize: filters.pageSize || 12,
    };
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    return api.get('/need', { params }).then(res => ({
      items: normalizeList(res.data, normalizeNeed),
      totalCount: res.data?.totalCount ?? (Array.isArray(res.data) ? res.data.length : 0),
    }));
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
