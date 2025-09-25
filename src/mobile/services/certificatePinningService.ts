import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';

export interface CertificatePinConfig {
  hostname: string;
  pins: string[]; // SHA-256 hashes of expected certificates
  includeSubdomains?: boolean;
  enforceOnLocalhost?: boolean;
}

export interface PinningResult {
  success: boolean;
  error?: string;
  certificateHash?: string;
}

class CertificatePinningService {
  private pinConfigs: Map<string, CertificatePinConfig> = new Map();
  private isEnabled: boolean = true;

  /**
   * Initialize certificate pinning with configuration
   */
  initialize(configs: CertificatePinConfig[]): void {
    this.pinConfigs.clear();
    
    configs.forEach(config => {
      this.pinConfigs.set(config.hostname, config);
      
      if (config.includeSubdomains) {
        // Add wildcard entry for subdomains
        this.pinConfigs.set(`*.${config.hostname}`, config);
      }
    });
  }

  /**
   * Add default pinning configuration for the app
   */
  initializeDefaultConfig(): void {
    const configs: CertificatePinConfig[] = [
      {
        hostname: 'api.arayanibul.com',
        pins: [
          // These would be the actual SHA-256 hashes of your production certificates
          // For development, you might want to disable pinning or use development certificates
          'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary certificate
          'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup certificate
        ],
        includeSubdomains: true,
        enforceOnLocalhost: false,
      },
      {
        hostname: 'localhost',
        pins: [
          // Development certificate pins (if using HTTPS locally)
          'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
        ],
        enforceOnLocalhost: false,
      },
    ];

    this.initialize(configs);
  }

  /**
   * Enable or disable certificate pinning
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if certificate pinning is enabled
   */
  isEnabledForEnvironment(): boolean {
    // Disable pinning in development mode
    if (__DEV__) {
      return false;
    }

    return this.isEnabled;
  }

  /**
   * Validate certificate for a given URL
   * Note: This is a simplified implementation. In a real app, you would need
   * to implement actual certificate validation using native modules or
   * configure it at the network layer.
   */
  async validateCertificate(url: string): Promise<PinningResult> {
    try {
      if (!this.isEnabledForEnvironment()) {
        return { success: true };
      }

      const hostname = this.extractHostname(url);
      const config = this.getPinConfigForHostname(hostname);

      if (!config) {
        // No pinning configuration for this hostname
        return { success: true };
      }

      // Skip validation for localhost in development unless explicitly enabled
      if (hostname === 'localhost' && !config.enforceOnLocalhost && __DEV__) {
        return { success: true };
      }

      // In a real implementation, you would:
      // 1. Extract the certificate from the TLS connection
      // 2. Calculate its SHA-256 hash
      // 3. Compare against the pinned hashes
      
      // For this demo, we'll simulate the validation
      const certificateHash = await this.simulateGetCertificateHash(url);
      
      if (config.pins.includes(certificateHash)) {
        return {
          success: true,
          certificateHash,
        };
      } else {
        return {
          success: false,
          error: `Certificate pinning failed for ${hostname}. Certificate hash does not match pinned values.`,
          certificateHash,
        };
      }
    } catch (error) {
      console.error('Certificate validation error:', error);
      return {
        success: false,
        error: 'Certificate validation failed due to an error.',
      };
    }
  }

  /**
   * Get certificate information for debugging
   */
  async getCertificateInfo(url: string): Promise<{
    hostname: string;
    hasPinning: boolean;
    pins?: string[];
    certificateHash?: string;
  }> {
    const hostname = this.extractHostname(url);
    const config = this.getPinConfigForHostname(hostname);
    
    const info = {
      hostname,
      hasPinning: !!config,
      pins: config?.pins,
      certificateHash: undefined as string | undefined,
    };

    try {
      info.certificateHash = await this.simulateGetCertificateHash(url);
    } catch (error) {
      console.error('Error getting certificate info:', error);
    }

    return info;
  }

  /**
   * Create a fetch wrapper that includes certificate pinning validation
   */
  createSecureFetch() {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      // Validate certificate before making the request
      const pinningResult = await this.validateCertificate(url);
      
      if (!pinningResult.success) {
        throw new Error(`Certificate pinning failed: ${pinningResult.error}`);
      }

      // Make the actual request
      return fetch(url, options);
    };
  }

  /**
   * Extract hostname from URL
   */
  private extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('Invalid URL:', url);
      return '';
    }
  }

  /**
   * Get pin configuration for hostname, including wildcard matching
   */
  private getPinConfigForHostname(hostname: string): CertificatePinConfig | undefined {
    // Direct match
    let config = this.pinConfigs.get(hostname);
    if (config) {
      return config;
    }

    // Check for wildcard matches
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length; i++) {
      const wildcardHostname = '*.' + parts.slice(i).join('.');
      config = this.pinConfigs.get(wildcardHostname);
      if (config) {
        return config;
      }
    }

    return undefined;
  }

  /**
   * Simulate getting certificate hash
   * In a real implementation, this would extract the actual certificate
   * from the TLS connection and calculate its SHA-256 hash
   */
  private async simulateGetCertificateHash(url: string): Promise<string> {
    const hostname = this.extractHostname(url);
    
    // For demo purposes, return a simulated hash based on hostname
    // In production, this would be the actual certificate hash
    const simulatedCertData = `certificate-data-for-${hostname}-${Date.now()}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      simulatedCertData
    );
    
    // Convert to base64 format typically used for certificate pinning
    return btoa(hash).substring(0, 43) + '=';
  }

  /**
   * Log certificate pinning events for monitoring
   */
  private logPinningEvent(event: 'success' | 'failure', hostname: string, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      hostname,
      details,
    };

    if (event === 'failure') {
      console.warn('Certificate pinning failure:', logData);
    } else {
      console.log('Certificate pinning success:', logData);
    }

    // In production, you might want to send these logs to your monitoring service
  }

  /**
   * Get pinning statistics for monitoring
   */
  getPinningStats(): {
    totalConfigs: number;
    enabledHostnames: string[];
    isGloballyEnabled: boolean;
  } {
    return {
      totalConfigs: this.pinConfigs.size,
      enabledHostnames: Array.from(this.pinConfigs.keys()),
      isGloballyEnabled: this.isEnabled,
    };
  }
}

export default new CertificatePinningService();