import { api } from './api';

// Payment Types
export interface InitializePaymentRequest {
  offerId: number;
  cardNumber: string;
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  threeDSecureUrl?: string;
  paymentId?: number;
  message?: string;
}

export interface PaymentCallbackResponse {
  success: boolean;
  message: string;
}

// Payment API
export const paymentAPI = {
  initializePayment: (data: InitializePaymentRequest): Promise<InitializePaymentResponse> =>
    api.post('/payment/initialize', data).then(res => res.data),

  verifyPaymentCallback: (paymentId: number, status: string): Promise<PaymentCallbackResponse> =>
    api.get('/payment/callback', { params: { paymentId, status } }).then(res => res.data),
};

// Card Validation Utilities
export const cardUtils = {
  // Format card number with spaces (XXXX XXXX XXXX XXXX)
  formatCardNumber: (value: string): string => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  },

  // Remove spaces from card number
  cleanCardNumber: (value: string): string => {
    return value.replace(/\s/g, '');
  },

  // Validate card number using Luhn algorithm
  validateCardNumber: (cardNumber: string): boolean => {
    const cleaned = cardUtils.cleanCardNumber(cardNumber);
    if (!/^\d{16}$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },

  // Validate CVV (3-4 digits)
  validateCVV: (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  },

  // Format expiry date (MM/YY)
  formatExpiryDate: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  },

  // Validate expiry date
  validateExpiryDate: (month: number, year: number): boolean => {
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Get last 2 digits
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  },

  // Parse expiry date string (MM/YY) to month and year
  parseExpiryDate: (expiryString: string): { month: number; year: number } | null => {
    const cleaned = expiryString.replace(/\D/g, '');
    if (cleaned.length !== 4) return null;

    const month = parseInt(cleaned.slice(0, 2), 10);
    const year = parseInt(cleaned.slice(2, 4), 10);

    return { month, year };
  },

  // Validate cardholder name
  validateCardHolderName: (name: string): boolean => {
    return name.trim().length >= 3 && /^[a-zA-Z\s]+$/.test(name);
  },
};