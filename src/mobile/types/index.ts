// Re-export all types from API service for convenience
export type {
  RegisterData,
  LoginData,
  SocialLoginData,
  AuthResponse,
  User,
  Category,
  Need,
  CreateNeedRequest,
  NeedFilters,
  Offer,
  CreateOfferRequest,
  Message,
  SendMessageRequest,
  Conversation,
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  UserRating,
  ReviewFilters,
} from '../services/api';

// Navigation types
export type RootStackParamList = {
  // Main app screens (always accessible)
  Home: undefined;
  Search: undefined;
  NeedDetail: { needId: number };
  
  // Auth screens (modal presentation)
  Login: undefined;
  Register: undefined;
  
  // Protected screens (require authentication)
  CreateNeed: undefined;
  CreateOffer: { needId: number };
  MyNeeds: undefined;
  MyOffers: undefined;
  Conversations: undefined;
  Chat: { offerId: number };
  Profile: { userId?: string };
  EditProfile: undefined;
  NotificationSettings: undefined;
  Notifications: undefined;
  Review: {
    revieweeId: string;
    revieweeName: string;
    offerId?: number;
    existingReview?: import('../services/api').Review;
    mode?: 'create' | 'edit';
  };
  ReviewHistory: { userId?: string };
  SecuritySettings: undefined;
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

// Component props types
export interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export interface ErrorProps {
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  validation?: (value: string) => string | undefined;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    primaryLight: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}