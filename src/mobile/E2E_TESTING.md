# Mobile E2E Testing Strategy

## Overview

This document outlines the End-to-End (E2E) testing strategy for the Arayanibul mobile application. E2E tests verify complete user workflows from start to finish, ensuring the app works correctly from a user's perspective.

## Testing Framework Options

### 1. Detox (Recommended for React Native)

Detox is a gray-box end-to-end testing and automation library for mobile apps.

**Installation:**
```bash
npm install --save-dev detox
```

**Configuration (detox.config.js):**
```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/e2e/init.js']
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Arayanibul.app',
      build: 'xcodebuild -workspace ios/Arayanibul.xcworkspace -scheme Arayanibul -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_30_x86'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### 2. Maestro (Alternative)

Maestro is a simpler, declarative mobile UI testing framework.

**Installation:**
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Test Scenarios

### 1. User Registration and Login Flow

**Test File: `e2e/auth.e2e.js`**
```javascript
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should register a new user successfully', async () => {
    // Navigate to register screen
    await element(by.id('register-button')).tap();
    
    // Fill registration form
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('firstName-input')).typeText('Test');
    await element(by.id('lastName-input')).typeText('User');
    
    // Submit registration
    await element(by.id('submit-register')).tap();
    
    // Verify successful registration
    await expect(element(by.text('Kayıt başarılı'))).toBeVisible();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should login with valid credentials', async () => {
    // Navigate to login screen
    await element(by.id('login-button')).tap();
    
    // Fill login form
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Submit login
    await element(by.id('submit-login')).tap();
    
    // Verify successful login
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should allow guest access', async () => {
    // Tap guest login
    await element(by.id('guest-login-button')).tap();
    
    // Verify guest access
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Misafir Kullanıcı'))).toBeVisible();
  });
});
```

### 2. Need Creation and Management Flow

**Test File: `e2e/needs.e2e.js`**
```javascript
describe('Need Management Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login as authenticated user
    await loginAsTestUser();
  });

  it('should create a new need successfully', async () => {
    // Navigate to create need screen
    await element(by.id('create-need-fab')).tap();
    
    // Fill need form
    await element(by.id('need-title-input')).typeText('iPhone 13 Pro arıyorum');
    await element(by.id('need-description-input')).typeText('Temiz durumda iPhone 13 Pro arıyorum');
    
    // Select category
    await element(by.id('category-picker')).tap();
    await element(by.text('Elektronik')).tap();
    
    // Set budget
    await element(by.id('min-budget-input')).typeText('20000');
    await element(by.id('max-budget-input')).typeText('25000');
    
    // Set urgency
    await element(by.id('urgency-normal')).tap();
    
    // Submit need
    await element(by.id('submit-need')).tap();
    
    // Verify need creation
    await expect(element(by.text('İhtiyaç başarıyla oluşturuldu'))).toBeVisible();
    await expect(element(by.id('my-needs-screen'))).toBeVisible();
  });

  it('should view need details', async () => {
    // Navigate to my needs
    await element(by.id('my-needs-tab')).tap();
    
    // Tap on first need
    await element(by.id('need-item-0')).tap();
    
    // Verify need details screen
    await expect(element(by.id('need-detail-screen'))).toBeVisible();
    await expect(element(by.text('iPhone 13 Pro arıyorum'))).toBeVisible();
  });
});
```

### 3. Offer Creation and Management Flow

**Test File: `e2e/offers.e2e.js`**
```javascript
describe('Offer Management Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginAsProvider();
  });

  it('should create an offer for a need', async () => {
    // Browse available needs
    await element(by.id('home-tab')).tap();
    
    // Tap on a need
    await element(by.id('need-item-0')).tap();
    
    // Create offer
    await element(by.id('create-offer-button')).tap();
    
    // Fill offer form
    await element(by.id('offer-price-input')).typeText('22000');
    await element(by.id('offer-description-input')).typeText('Sıfır kutusunda iPhone 13 Pro');
    await element(by.id('delivery-days-input')).typeText('1');
    
    // Submit offer
    await element(by.id('submit-offer')).tap();
    
    // Verify offer creation
    await expect(element(by.text('Teklif başarıyla gönderildi'))).toBeVisible();
  });

  it('should view my offers', async () => {
    // Navigate to my offers
    await element(by.id('my-offers-tab')).tap();
    
    // Verify offers list
    await expect(element(by.id('my-offers-screen'))).toBeVisible();
    await expect(element(by.id('offer-item-0'))).toBeVisible();
  });
});
```

### 4. Messaging Flow

**Test File: `e2e/messaging.e2e.js`**
```javascript
describe('Messaging Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await setupBuyerProviderScenario();
  });

  it('should send and receive messages', async () => {
    // As provider, navigate to conversations
    await element(by.id('messages-tab')).tap();
    
    // Open conversation
    await element(by.id('conversation-item-0')).tap();
    
    // Send message
    await element(by.id('message-input')).typeText('Merhaba, ürün hakkında soru sormak istiyorum');
    await element(by.id('send-message-button')).tap();
    
    // Verify message sent
    await expect(element(by.text('Merhaba, ürün hakkında soru sormak istiyorum'))).toBeVisible();
    
    // Switch to buyer account and verify message received
    await switchToBuyerAccount();
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-item-0')).tap();
    
    await expect(element(by.text('Merhaba, ürün hakkında soru sormak istiyorum'))).toBeVisible();
  });
});
```

## Test Utilities

**File: `e2e/utils.js`**
```javascript
export const loginAsTestUser = async () => {
  await element(by.id('login-button')).tap();
  await element(by.id('email-input')).typeText('test@example.com');
  await element(by.id('password-input')).typeText('password123');
  await element(by.id('submit-login')).tap();
  await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
};

export const loginAsProvider = async () => {
  await element(by.id('login-button')).tap();
  await element(by.id('email-input')).typeText('provider@example.com');
  await element(by.id('password-input')).typeText('password123');
  await element(by.id('submit-login')).tap();
  await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
};

export const setupBuyerProviderScenario = async () => {
  // Create test data: buyer with need, provider with offer
  // This would typically involve API calls to set up test data
};

export const clearAppData = async () => {
  await device.clearKeychain();
  // Clear AsyncStorage or other persistent data
};
```

## Test Data Management

### Mock Server Setup

For E2E tests, you might want to use a mock server to control API responses:

```javascript
// e2e/mockServer.js
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com' }
      })
    );
  }),
  
  rest.get('/api/needs', (req, res, ctx) => {
    return res(
      ctx.json({
        items: [
          {
            id: 1,
            title: 'Test Need',
            description: 'Test Description',
            status: 'Active'
          }
        ],
        totalCount: 1
      })
    );
  })
);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build iOS app
        run: detox build --configuration ios.sim.debug
      
      - name: Run E2E tests
        run: detox test --configuration ios.sim.debug

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Create AVD
        run: |
          echo "y" | $ANDROID_HOME/tools/bin/sdkmanager --install "system-images;android-30;google_apis;x86"
          echo "no" | $ANDROID_HOME/tools/bin/avdmanager create avd -n test -k "system-images;android-30;google_apis;x86"
      
      - name: Start emulator
        run: |
          $ANDROID_HOME/emulator/emulator -avd test -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim &
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Android app
        run: detox build --configuration android.emu.debug
      
      - name: Run E2E tests
        run: detox test --configuration android.emu.debug
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests
2. **Test Data**: Use fresh test data for each test run
3. **Waiting Strategies**: Use proper waiting strategies for async operations
4. **Page Object Pattern**: Organize tests using page objects for better maintainability
5. **Error Handling**: Include proper error handling and cleanup in tests
6. **Performance**: Keep tests focused and avoid unnecessary delays
7. **Debugging**: Use screenshots and logs for debugging failed tests

## Running Tests

```bash
# iOS Simulator
npm run e2e:ios

# Android Emulator  
npm run e2e:android

# Run specific test file
detox test e2e/auth.e2e.js --configuration ios.sim.debug

# Run with verbose logging
detox test --configuration ios.sim.debug --loglevel verbose
```

This E2E testing strategy provides comprehensive coverage of the main user journeys in the Arayanibul mobile application, ensuring the app works correctly from a user's perspective across different platforms and scenarios.