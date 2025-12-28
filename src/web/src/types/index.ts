// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  isGuest: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  description?: string;
  iconName?: string;
  parentId?: number;
  subcategories?: Category[];
}

// Need (Ad) types
export type NeedStatus = 'Active' | 'Closed' | 'Expired' | 'Draft';

export type Urgency = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Need {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  category?: Category;
  userId: string;
  user?: User;
  status: NeedStatus;
  budget?: number;
  budgetMax?: number;
  currencyCode: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  urgency: Urgency;
  viewCount: number;
  offerCount: number;
  images?: NeedImage[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface NeedImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface CreateNeedRequest {
  title: string;
  description: string;
  categoryId: number;
  budget?: number;
  budgetMax?: number;
  currencyCode?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  urgency?: Urgency;
  images?: File[];
}

// Offer types
export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

export interface Offer {
  id: number;
  needId: number;
  need?: Need;
  userId: string;
  user?: User;
  price: number;
  currencyCode: string;
  description: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferRequest {
  needId: number;
  price: number;
  currencyCode?: string;
  description: string;
}

// Message types
export interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: number;
  otherUser: User;
  lastMessage?: Message;
  unreadCount: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Filter types
export interface NeedFilters {
  categoryId?: number;
  minBudget?: number;
  maxBudget?: number;
  urgency?: Urgency;
  location?: string;
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'budget_low' | 'budget_high';
  pageNumber?: number;
  pageSize?: number;
}
