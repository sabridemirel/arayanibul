import certificatePinningService from './certificatePinningService';
import secureStorageService from './secureStorageService';

export interface SecureApiOptions {
  baseURL: string;
  timeout?: number;
  enableCertificatePinning?: boolean;
  enableRequestLogging?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

class SecureApiClient {
  private baseURL: string;
  private timeout: number;
  private enableCertificatePinning: boolean;
  private enableRequestLogging: boolean;
  private defaultHeaders: Record<string, string>;

  constructor(options: SecureApiOptions) {
    this.baseURL = options.baseURL;
    this.timeout = options.timeout || 30000;
    this.enableCertificatePinning = options.enableCertificatePinning ?? true;
    this.enableRequestLogging = options.enableRequestLogging ?? __DEV__;
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ArayanibulMobile/1.0',
    };

    // Initialize certificate pinning
    if (this.enableCertificatePinning) {
      certificatePinningService.initializeDefaultConfig();
    }
  }

  /**
   * Make a secure HTTP request
   */
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    options: {
      data?: any;
      headers?: Record<string, string>;
      requireAuth?: boolean;
      timeout?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const requestId = this.generateRequestId();

    try {
      // Log request if enabled
      if (this.enableRequestLogging) {
        this.logRequest(requestId, method, url, options);
      }

      // Validate certificate if pinning is enabled
      if (this.enableCertificatePinning) {
        const pinningResult = await certificatePinningService.validateCertificate(url);
        if (!pinningResult.success) {
          throw new Error(`Certificate validation failed: ${pinningResult.error}`);
        }
      }

      // Prepare headers
      const headers = await this.prepareHeaders(options.headers, options.requireAuth);

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(options.timeout || this.timeout),
      };

      // Add body for non-GET requests
      if (method !== 'GET' && options.data) {
        requestOptions.body = JSON.stringify(options.data);
      }

      // Make the request
      const response = await fetch(url, requestOptions);

      // Parse response
      const responseData = await this.parseResponse<T>(response);

      // Log response if enabled
      if (this.enableRequestLogging) {
        this.logResponse(requestId, response.status, responseData);
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
      };
    } catch (error) {
      // Log error if enabled
      if (this.enableRequestLogging) {
        this.logError(requestId, error);
      }

      throw this.handleError(error);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<Parameters<typeof this.request>[2], 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options: Omit<Parameters<typeof this.request>[2], 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...options, data });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options: Omit<Parameters<typeof this.request>[2], 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...options, data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<Parameters<typeof this.request>[2], 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options: Omit<Parameters<typeof this.request>[2], 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...options, data });
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: File | Blob,
    options: {
      fieldName?: string;
      additionalData?: Record<string, any>;
      onProgress?: (progress: number) => void;
      requireAuth?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const requestId = this.generateRequestId();

    try {
      // Validate certificate if pinning is enabled
      if (this.enableCertificatePinning) {
        const pinningResult = await certificatePinningService.validateCertificate(url);
        if (!pinningResult.success) {
          throw new Error(`Certificate validation failed: ${pinningResult.error}`);
        }
      }

      // Prepare form data
      const formData = new FormData();
      formData.append(options.fieldName || 'file', file);

      if (options.additionalData) {
        Object.entries(options.additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      // Prepare headers (without Content-Type for FormData)
      const headers = await this.prepareHeaders({}, options.requireAuth);
      delete headers['Content-Type']; // Let browser set it for FormData

      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(this.timeout),
      });

      const responseData = await this.parseResponse<T>(response);

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
      };
    } catch (error) {
      if (this.enableRequestLogging) {
        this.logError(requestId, error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * Get certificate pinning information for debugging
   */
  async getCertificateInfo(endpoint: string = '') {
    const url = this.buildUrl(endpoint);
    return await certificatePinningService.getCertificateInfo(url);
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  private async prepareHeaders(customHeaders: Record<string, string> = {}, requireAuth: boolean = true): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    if (requireAuth) {
      const tokens = await secureStorageService.getAuthTokens();
      if (tokens.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails: any = null;

      try {
        if (contentType?.includes('application/json')) {
          errorDetails = await response.json();
          errorMessage = errorDetails.message || errorDetails.error || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (parseError) {
        // Use default error message if parsing fails
      }

      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        details: errorDetails,
      };

      throw apiError;
    }

    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text() as unknown as T;
    }
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    return headerObj;
  }

  private handleError(error: any): ApiError {
    if (error.name === 'AbortError') {
      return {
        message: 'İstek zaman aşımına uğradı',
        code: 'TIMEOUT',
      };
    }

    if (error.message?.includes('Certificate validation failed')) {
      return {
        message: 'Güvenlik sertifikası doğrulaması başarısız',
        code: 'CERTIFICATE_ERROR',
        details: error.message,
      };
    }

    if (error.message?.includes('Network request failed')) {
      return {
        message: 'Ağ bağlantısı hatası',
        code: 'NETWORK_ERROR',
      };
    }

    // If it's already an ApiError, return as is
    if (error.message && typeof error.status === 'number') {
      return error as ApiError;
    }

    return {
      message: error.message || 'Bilinmeyen hata oluştu',
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private logRequest(requestId: string, method: string, url: string, options: any): void {
    console.log(`[API Request ${requestId}]`, {
      method,
      url,
      headers: options.headers,
      data: options.data,
      timestamp: new Date().toISOString(),
    });
  }

  private logResponse(requestId: string, status: number, data: any): void {
    console.log(`[API Response ${requestId}]`, {
      status,
      dataSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString(),
    });
  }

  private logError(requestId: string, error: any): void {
    console.error(`[API Error ${requestId}]`, {
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString(),
    });
  }
}

export default SecureApiClient;