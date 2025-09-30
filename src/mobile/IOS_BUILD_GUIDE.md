# iOS Build Guide - Arayanibul

Complete guide for building and deploying the Arayanibul mobile app on iOS.

## Prerequisites

### Required Tools
- macOS (for local builds and testing)
- Xcode 14.0 or later
- Node.js 16+ and npm
- Expo CLI
- EAS CLI: `npm install -g eas-cli`
- Apple Developer Account (for TestFlight and App Store)

### Configuration Check

Before building, verify your `app.json` configuration:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.arayanibul.app",
      "buildNumber": "1",
      "deploymentTarget": "13.4",
      "infoPlist": {
        "NSCameraUsageDescription": "...",
        "NSPhotoLibraryUsageDescription": "...",
        "NSLocationWhenInUseUsageDescription": "...",
        "CFBundleURLTypes": [...]
      }
    }
  }
}
```

## Build Types

### 1. Development Build (For Testing)

Development builds include dev tools and allow for faster iteration:

```bash
# Login to Expo
eas login

# Configure project (first time only)
eas build:configure

# Create development build
eas build --profile development --platform ios

# For local build (requires macOS and Xcode)
eas build --profile development --platform ios --local
```

**Use cases:**
- Testing OAuth (Google/Facebook login)
- Testing push notifications
- Testing native modules
- QA and internal testing

### 2. Preview Build (For TestFlight)

Preview builds are optimized but still include some debugging:

```bash
# Create preview build
eas build --profile preview --platform ios
```

**Use cases:**
- Beta testing with TestFlight
- Stakeholder reviews
- Pre-production testing

### 3. Production Build (For App Store)

Production builds are fully optimized for release:

```bash
# Create production build
eas build --profile production --platform ios
```

**Use cases:**
- App Store submission
- Public release

## EAS Build Profiles

Configure build profiles in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

## iOS Simulator Testing

### Using Expo Go (Limited Features)
```bash
# Start development server
npx expo start

# Press 'i' to open in iOS simulator
# Note: OAuth and native modules won't work
```

### Using Development Build
```bash
# Build for simulator
eas build --profile development --platform ios

# Download and install .app file to simulator
# Or use: npx expo run:ios
```

### Run on Device Simulator
```bash
# Start Metro bundler and build
npx expo run:ios

# Specify device
npx expo run:ios --device "iPhone 14 Pro"

# List available devices
xcrun simctl list devices
```

## Physical Device Testing

### Option 1: Development Build via EAS
```bash
# Build and sign with your Apple Developer account
eas build --profile development --platform ios

# Share the .ipa file or use TestFlight
```

### Option 2: Direct Install (Requires Cable)
```bash
# Connect your iOS device via USB
# Device must be in Developer Mode (Settings > Privacy & Security)

# Build and install directly
npx expo run:ios --device
```

## TestFlight Distribution

### 1. Create Production/Preview Build
```bash
# Build for TestFlight
eas build --profile preview --platform ios

# Or production build
eas build --profile production --platform ios
```

### 2. Submit to TestFlight
```bash
# Automatic submission
eas submit --platform ios

# Or manually upload via Xcode/App Store Connect
```

### 3. Add Testers
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your app > TestFlight
3. Add internal or external testers
4. Testers receive email invitation

## App Store Submission

### 1. Prepare App Store Assets
- App icon (1024x1024 PNG)
- Screenshots for all device sizes
- App description and keywords
- Privacy policy URL
- Support URL

### 2. Create Production Build
```bash
# Build for App Store
eas build --profile production --platform ios
```

### 3. Submit to App Store
```bash
# Submit via EAS
eas submit --platform ios

# Follow prompts to configure submission
```

### 4. Complete App Store Listing
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Add app metadata:
   - App name and subtitle
   - Description
   - Keywords
   - Screenshots
   - Privacy details
   - Age rating
3. Submit for review

## Code Signing

### Automatic Signing (Recommended)
EAS handles certificates and provisioning profiles automatically:

```bash
# Let EAS manage credentials
eas build --platform ios
# Select "Let Expo handle the process"
```

### Manual Signing
If you need manual control:

```bash
# View credentials
eas credentials

# Configure manually in App Store Connect
```

## Common Build Issues

### Build Failed: "No Provisioning Profile"
**Solution:**
```bash
# Clear credentials and regenerate
eas credentials -p ios
# Select "Remove all credentials"
# Then rebuild
```

### Build Failed: "Code Signing Error"
**Solution:**
- Verify bundle identifier matches in App Store Connect
- Check Apple Developer account is active
- Ensure certificates haven't expired

### Build Failed: "Missing Permissions"
**Solution:**
- Verify all NSUsageDescription keys in app.json
- Required permissions already configured in app.json

### Simulator Build Not Installing
**Solution:**
```bash
# Reset simulator
xcrun simctl erase all

# Rebuild
npx expo run:ios
```

## Version Management

### Update Version Number
Edit `app.json`:
```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

- `version`: User-facing version (1.0.0, 1.0.1, etc.)
- `buildNumber`: Internal build number (must increment with each build)

## Performance Optimization

### 1. Enable Hermes Engine (Already enabled in Expo SDK 51+)
Hermes improves startup time and reduces memory usage.

### 2. Optimize Images
```bash
# Use compressed images
# Ensure retina assets (@2x, @3x) are provided
```

### 3. Enable Production Mode
Production builds automatically:
- Minify JavaScript
- Remove console.log statements
- Optimize assets
- Enable ProGuard (Android)

## Monitoring and Debugging

### View Build Logs
```bash
# During build
# Build logs shown in terminal

# After build
# View in EAS dashboard: https://expo.dev/accounts/[username]/projects/arayanibul/builds
```

### Runtime Debugging
```bash
# Development build includes React Native Debugger
# Shake device or press Cmd+D to open menu
```

### Crash Reporting
Consider integrating:
- Sentry
- Firebase Crashlytics
- BugSnag

## Useful Commands

```bash
# Check iOS setup
npx expo doctor

# Clean build cache
npx expo start --clear

# View device logs
npx react-native log-ios

# Build locally (requires macOS)
eas build --platform ios --local

# Check credentials
eas credentials -p ios

# Download build artifact
eas build:list
# Then download from dashboard
```

## Resources

- [Expo iOS Build Docs](https://docs.expo.dev/build/setup/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Apple Developer Portal](https://developer.apple.com/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Checklist Before Release

- [ ] OAuth credentials configured (if using social login)
- [ ] Push notification setup complete
- [ ] All permission descriptions clear and accurate
- [ ] App tested on physical iOS devices
- [ ] TestFlight beta testing completed
- [ ] All features tested in production build
- [ ] Privacy policy and terms of service ready
- [ ] App Store listing complete with screenshots
- [ ] Version and build numbers updated
- [ ] Crash reporting configured
- [ ] Analytics integrated (if needed)