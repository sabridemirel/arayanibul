# OAuth Setup Guide - Google & Facebook Authentication

This guide will help you configure Google and Facebook OAuth authentication for the Arayanibul mobile app.

## Prerequisites

- An Expo account (for development builds)
- Google Cloud Platform account
- Facebook Developer account
- Native build capability (OAuth won't work in Expo Go)

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** for your project

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Create credentials for each platform:

#### Web Client ID (Required for all platforms)
- Application type: **Web application**
- Authorized redirect URIs: `https://auth.expo.io/@YOUR_EXPO_USERNAME/arayanibul`
- Copy the **Client ID** to `.env` as `GOOGLE_WEB_CLIENT_ID`

#### iOS Client ID
- Application type: **iOS**
- Bundle ID: `com.arayanibul.app`
- Copy the **Client ID** to `.env` as `GOOGLE_IOS_CLIENT_ID`
- Download the `GoogleService-Info.plist` file

#### Android Client ID
- Application type: **Android**
- Package name: `com.arayanibul.app`
- SHA-1 certificate fingerprint: Get from Expo with `eas credentials`
- Copy the **Client ID** to `.env` as `GOOGLE_ANDROID_CLIENT_ID`
- Download the `google-services.json` file

### 3. Configure App

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Google credentials:
   ```env
   GOOGLE_WEB_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   GOOGLE_IOS_CLIENT_ID=123456789-qrstuvwxyz.apps.googleusercontent.com
   GOOGLE_ANDROID_CLIENT_ID=123456789-123456789.apps.googleusercontent.com
   ```

3. Place credential files:
   - Android: `google-services.json` in project root
   - iOS: `GoogleService-Info.plist` in project root

4. Update `app.json`:
   ```json
   {
     "expo": {
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist",
         "infoPlist": {
           "CFBundleURLTypes": [
             {
               "CFBundleURLSchemes": [
                 "com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID"
               ]
             }
           ]
         }
       },
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

## Facebook OAuth Setup

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Select **Consumer** as app type
4. Fill in app details and create

### 2. Configure Facebook Login

1. In your app dashboard, go to **Products** > **Facebook Login** > **Settings**
2. Add OAuth Redirect URIs:
   - `https://auth.expo.io/@YOUR_EXPO_USERNAME/arayanibul`
   - `fb{FACEBOOK_APP_ID}://authorize`

3. Configure platform settings:

#### iOS Configuration
- Go to **Settings** > **Basic** > **Add Platform** > **iOS**
- Bundle ID: `com.arayanibul.app`
- Enable Single Sign-On

#### Android Configuration
- Go to **Settings** > **Basic** > **Add Platform** > **Android**
- Package Name: `com.arayanibul.app`
- Key Hashes: Get from Expo with `eas credentials`
- Enable Single Sign-On

### 3. Configure App

1. Update `.env` with Facebook credentials:
   ```env
   FACEBOOK_APP_ID=1234567890123456
   FACEBOOK_APP_NAME=Arayanibul
   FACEBOOK_CLIENT_TOKEN=abcdef1234567890abcdef1234567890
   ```

2. Update `app.json`:
   ```json
   {
     "expo": {
       "ios": {
         "infoPlist": {
           "CFBundleURLTypes": [
             {
               "CFBundleURLSchemes": [
                 "fb{FACEBOOK_APP_ID}"
               ]
             }
           ],
           "LSApplicationQueriesSchemes": ["fbapi", "fb-messenger-share-api"]
         }
       },
       "android": {
         "manifestPlaceholders": {
           "FACEBOOK_APP_ID": "{FACEBOOK_APP_ID}"
         }
       }
     }
   }
   ```

## Building the App

OAuth authentication requires a native build. You cannot test it with Expo Go.

### Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS (macOS required)
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android
```

### Production Build

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Testing OAuth

### iOS Testing
1. Install the development build on your iOS device or simulator
2. Tap "Google ile Giriş" or "Facebook ile Giriş"
3. Complete the OAuth flow
4. App should receive the access token and authenticate

### Android Testing
1. Install the development build on your Android device or emulator
2. Tap "Google ile Giriş" or "Facebook ile Giriş"
3. Complete the OAuth flow
4. App should receive the access token and authenticate

## Troubleshooting

### Google Sign-In Issues

**Error: "Configuration error"**
- Verify all Client IDs are correct in `.env`
- Ensure `google-services.json` or `GoogleService-Info.plist` are in place
- Check bundle ID matches in Google Console

**Error: "Sign-in failed"**
- Ensure SHA-1 certificate matches (Android)
- Check OAuth consent screen is configured
- Verify redirect URIs are correct

### Facebook Sign-In Issues

**Error: "Invalid key hash"**
- Generate and add correct key hash in Facebook Developer Console
- Use `keytool` or Expo credentials to get SHA-1

**Error: "App not setup"**
- Ensure Facebook app is not in development mode (or your test account is added)
- Check App ID and App Name match exactly

### Common Issues

**"This feature requires a native build"**
- You're using Expo Go, which doesn't support OAuth
- Build a development build with `eas build --profile development`

**"Redirect URI mismatch"**
- Check all redirect URIs are added to Google/Facebook console
- Verify Expo username is correct in URIs

## Security Notes

1. **Never commit credentials**:
   - `.env` is in `.gitignore`
   - `google-services.json` should be gitignored
   - `GoogleService-Info.plist` should be gitignored

2. **Use environment variables**:
   - Store sensitive data in `.env`
   - Use different credentials for development and production

3. **Secure your backend**:
   - Validate OAuth tokens on the backend
   - Never trust client-side authentication alone
   - Implement rate limiting

## Additional Resources

- [Expo Google Sign-In Guide](https://docs.expo.dev/guides/google-authentication/)
- [Expo Facebook Sign-In Guide](https://docs.expo.dev/guides/facebook-authentication/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)