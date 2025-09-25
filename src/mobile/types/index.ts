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
  Auth: undefined;
  Main: undefined;
  NeedDetail: { needId: number };
  CreateNeed: undefined;
  CreateOffer: { needId: number };
  OfferDetail: { offerId: number };
  Chat: { offerId: number };
  Profile: { userId?: string };
  MyOffers: undefined;
  Review: {
    revieweeId: string;
    revieweeName: string;
    offerId?: number;
    existingReview?: Review;
    mode?: 'create' | 'edit';
  };
  ReviewHistory: { userId?: string };
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