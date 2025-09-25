import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface SecureStorageOptions {
  requireAuthentication?: boolean;
  accessGroup?: string;
}

class SecureStorageService {
  private readonly keyPrefix = 'arayanibul_';
  
  /**
   * Store sensitive data securely using Expo SecureStore
   */
  async setSecureItem(key: string, value: string, options?: SecureStorageOptions): Promise<void> {
    try {
      const secureKey = this.keyPrefix + key;
      
      const storeOptions: SecureStore.SecureStoreOptions = {
        requireAuthentication: options?.requireAuthentication || false,
      };

      if (options?.accessGroup) {
        storeOptions.accessGroup = options.accessGroup;
      }

      await SecureStore.setItemAsync(secureKey, value, storeOptions);
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw new Error('Güvenli depolama hatası');
    }
  }

  /**
   * Retrieve sensitive data from secure storage
   */
  async getSecureItem(key: string, options?: SecureStorageOptions): Promise<string | null> {
    try {
      const secureKey = this.keyPrefix + key;
      
      const storeOptions: SecureStore.SecureStoreOptions = {
        requireAuthentication: options?.requireAuthentication || false,
      };

      if (options?.accessGroup) {
        storeOptions.accessGroup = options.accessGroup;
      }

      return await SecureStore.getItemAsync(secureKey, storeOptions);
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  }

  /**
   * Remove item from secure storage
   */
  async removeSecureItem(key: string, options?: SecureStorageOptions): Promise<void> {
    try {
      const secureKey = this.keyPrefix + key;
      
      const storeOptions: SecureStore.SecureStoreOptions = {
        requireAuthentication: options?.requireAuthentication || false,
      };

      if (options?.accessGroup) {
        storeOptions.accessGroup = options.accessGroup;
      }

      await SecureStore.deleteItemAsync(secureKey, storeOptions);
    } catch (error) {
      console.error('Error removing secure item:', error);
    }
  }

  /**
   * Store encrypted data in AsyncStorage for non-sensitive but private data
   */
  async setEncryptedItem(key: string, value: string): Promise<void> {
    try {
      const encryptionKey = await this.getOrCreateEncryptionKey();
      const encrypted = await this.encrypt(value, encryptionKey);
      const storageKey = this.keyPrefix + 'enc_' + key;
      
      await AsyncStorage.setItem(storageKey, encrypted);
    } catch (error) {
      console.error('Error storing encrypted item:', error);
      throw new Error('Şifreli depolama hatası');
    }
  }

  /**
   * Retrieve encrypted data from AsyncStorage
   */
  async getEncryptedItem(key: string): Promise<string | null> {
    try {
      const storageKey = this.keyPrefix + 'enc_' + key;
      const encrypted = await AsyncStorage.getItem(storageKey);
      
      if (!encrypted) {
        return null;
      }

      const encryptionKey = await this.getOrCreateEncryptionKey();
      return await this.decrypt(encrypted, encryptionKey);
    } catch (error) {
      console.error('Error retrieving encrypted item:', error);
      return null;
    }
  }

  /**
   * Remove encrypted item from AsyncStorage
   */
  async removeEncryptedItem(key: string): Promise<void> {
    try {
      const storageKey = this.keyPrefix + 'enc_' + key;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing encrypted item:', error);
    }
  }

  /**
   * Clear all secure and encrypted data
   */
  async clearAllSecureData(): Promise<void> {
    try {
      // Clear secure store items
      const secureKeys = ['authToken', 'refreshToken', 'biometricKey', 'encryptionKey'];
      for (const key of secureKeys) {
        await this.removeSecureItem(key);
      }

      // Clear encrypted AsyncStorage items
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => key.startsWith(this.keyPrefix + 'enc_'));
      
      if (encryptedKeys.length > 0) {
        await AsyncStorage.multiRemove(encryptedKeys);
      }
    } catch (error) {
      console.error('Error clearing secure data:', error);
    }
  }

  /**
   * Check if secure storage is available
   */
  async isSecureStorageAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate or retrieve encryption key for AsyncStorage encryption
   */
  private async getOrCreateEncryptionKey(): Promise<string> {
    try {
      let key = await this.getSecureItem('encryptionKey');
      
      if (!key) {
        // Generate new encryption key
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Math.random().toString(36) + Date.now().toString()
        );
        
        await this.setSecureItem('encryptionKey', key);
      }
      
      return key;
    } catch (error) {
      console.error('Error with encryption key:', error);
      throw new Error('Şifreleme anahtarı hatası');
    }
  }

  /**
   * Simple encryption using base64 and key mixing (for demo purposes)
   * In production, use proper encryption libraries like crypto-js
   */
  private async encrypt(text: string, key: string): Promise<string> {
    try {
      // Simple XOR encryption with base64 encoding
      const keyBytes = new TextEncoder().encode(key);
      const textBytes = new TextEncoder().encode(text);
      const encrypted = new Uint8Array(textBytes.length);
      
      for (let i = 0; i < textBytes.length; i++) {
        encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      
      // Convert to base64
      const base64 = btoa(String.fromCharCode(...encrypted));
      return base64;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Şifreleme hatası');
    }
  }

  /**
   * Simple decryption
   */
  private async decrypt(encryptedText: string, key: string): Promise<string> {
    try {
      // Decode from base64
      const encrypted = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );
      
      const keyBytes = new TextEncoder().encode(key);
      const decrypted = new Uint8Array(encrypted.length);
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Şifre çözme hatası');
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await this.setSecureItem('authToken', accessToken, { requireAuthentication: false });
    
    if (refreshToken) {
      await this.setSecureItem('refreshToken', refreshToken, { requireAuthentication: false });
    }
  }

  /**
   * Retrieve authentication tokens
   */
  async getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const accessToken = await this.getSecureItem('authToken');
    const refreshToken = await this.getSecureItem('refreshToken');
    
    return { accessToken, refreshToken };
  }

  /**
   * Clear authentication tokens
   */
  async clearAuthTokens(): Promise<void> {
    await this.removeSecureItem('authToken');
    await this.removeSecureItem('refreshToken');
  }
}

export default new SecureStorageService();