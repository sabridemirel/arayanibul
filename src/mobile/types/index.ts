// Re-export all types from API service for convenience
export type {
  RegisterData,
  LoginData,
  AppleLoginData,
  AuthResponse,
  User,
  Category,
  Need,
  NeedStatus,
  BlockedUser,
  ReportTargetType,
  ReportReason,
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
  UserStats,
  Transaction,
  TransactionFilters,
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
  /** Quick listing: one sentence, then confirm. `initialText` pre-fills the sentence (e.g. a search). */
  CreateNeed: { initialText?: string } | undefined;
  /** The long listing form, optionally carrying over what the quick flow already understood. */
  /** The listing form; detailsOpen when it was opened as "Ayrıntılı formu kullan" */
  CreateNeedDetailed: { prefill?: NeedPrefill; detailsOpen?: boolean } | undefined;
  EditNeed: { needId: number };
  /** "Gerçek Fiyat" page of a catalogued product; the buyer panel can arrive opened and pre-filled */
  ProductPrice: { slug: string; openBid?: boolean; price?: string; address?: string };
  CreateOffer: { needId: number };
  MyNeeds: undefined;
  MyOffers: undefined;
  Conversations: undefined;
  Chat: { offerId: number; otherUserId?: string };
  Profile: { userId?: string };
  EditProfile: undefined;
  NotificationSettings: undefined;
  CategoryFollows: undefined;
  BlockedUsers: undefined;
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

/** What the quick-listing sentence gives the listing form */
export interface NeedPrefill {
  values: import('../components/need/listingForm').ListingFormValues;
  questions: import('../services/api').NeedDraftQuestion[];
  product: import('../components/need/listingForm').ProductHint | null;
}
