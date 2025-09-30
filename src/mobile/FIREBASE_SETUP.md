# Firebase Push Notifications Setup

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the Arayanibul mobile app.

## Prerequisites

- A Firebase account (https://console.firebase.google.com)
- Expo account (for push notification credentials)
- Access to the Arayanibul project

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select existing project
3. Enter project name: `arayanibul` (or your preferred name)
4. Disable Google Analytics (optional, can be enabled later)
5. Click "Create project"

## Step 2: Add Android App to Firebase

### 2.1 Register Android App

1. In Firebase Console, click the Android icon to add Android app
2. Fill in the details:
   - **Android package name**: `com.arayanibul.app` (match your app.json)
   - **App nickname**: Arayanibul Android (optional)
   - **Debug signing certificate SHA-1**: (optional for now)
3. Click "Register app"

### 2.2 Download google-services.json

1. Download the `google-services.json` file
2. For **Expo Managed Workflow**:
   - Create directory: `src/mobile/config/`
   - Place file at: `src/mobile/config/google-services.json`
   - This file will be used during EAS build

3. For **Bare Workflow** (if you ejected):
   - Place file at: `src/mobile/android/app/google-services.json`

### 2.3 Update app.json for Android

Add the following to your `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./config/google-services.json",
      "package": "com.arayanibul.app"
    }
  }
}
```

## Step 3: Add iOS App to Firebase

### 3.1 Register iOS App

1. In Firebase Console, click the iOS icon to add iOS app
2. Fill in the details:
   - **iOS bundle ID**: `com.arayanibul.app` (match your app.json)
   - **App nickname**: Arayanibul iOS (optional)
   - **App Store ID**: (leave empty for now)
3. Click "Register app"

### 3.2 Download GoogleService-Info.plist

1. Download the `GoogleService-Info.plist` file
2. For **Expo Managed Workflow**:
   - Create directory: `src/mobile/config/`
   - Place file at: `src/mobile/config/GoogleService-Info.plist`
   - This file will be used during EAS build

3. For **Bare Workflow** (if you ejected):
   - Place file at: `src/mobile/ios/GoogleService-Info.plist`

### 3.3 Update app.json for iOS

Add the following to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./config/GoogleService-Info.plist",
      "bundleIdentifier": "com.arayanibul.app"
    }
  }
}
```

## Step 4: Enable Cloud Messaging

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on **Cloud Messaging** tab
3. For Android:
   - Note your **Server key** (for backend API)
   - Note your **Sender ID**
4. For iOS:
   - Upload your APNs Authentication Key or Certificate
   - This requires Apple Developer account

## Step 5: Install Required Packages

The required packages are already installed in package.json:

```bash
# Already installed
expo-notifications@~0.28.19
expo-device@~6.0.2
```

If not installed, run:
```bash
cd src/mobile
npm install expo-notifications expo-device
```

## Step 6: Configure Push Notifications in Code

The app already has notification setup in `/Users/sabridemirel/arayanibul/src/mobile/contexts/NotificationContext.tsx`

Verify the following:
1. NotificationProvider wraps your app in App.tsx
2. Push notification token is sent to backend
3. Notification handlers are set up

## Step 7: Backend Configuration

Update your .NET backend to send notifications:

1. Add Firebase Admin SDK to backend:
```bash
cd src/backend/API
dotnet add package FirebaseAdmin
```

2. In your backend, add Firebase configuration:
   - Download service account key from Firebase Console
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `firebase-admin-sdk.json` (DON'T commit to git)

3. Initialize Firebase Admin in your .NET API:
```csharp
FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromFile("path/to/firebase-admin-sdk.json")
});
```

## Step 8: Test Push Notifications

### Test with Expo Push Notifications Tool

1. Get your Expo push token from the app (logged in console)
2. Visit: https://expo.dev/notifications
3. Enter your token and send a test notification

### Test with Firebase Console

1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Select your app
5. Send test message

## Step 9: Production Build

For production builds with EAS:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Security Notes

1. **NEVER commit Firebase config files to git**
   - `google-services.json`
   - `GoogleService-Info.plist`
   - `firebase-admin-sdk.json`

2. These files are added to `.gitignore`

3. For team development:
   - Share config files securely (e.g., 1Password, encrypted)
   - Or each developer creates their own Firebase project for testing

4. For production:
   - Use separate Firebase projects for dev/staging/production
   - Use environment variables for API keys
   - Enable App Check for additional security

## Troubleshooting

### Notifications not received on Android
- Check if google-services.json is properly configured
- Verify package name matches in app.json and Firebase
- Check if device has Google Play Services
- Test on physical device (not emulator)

### Notifications not received on iOS
- Check if APNs certificate/key is uploaded to Firebase
- Verify bundle identifier matches in app.json and Firebase
- Test on physical device (simulator doesn't support push)
- Check if notification permissions are granted

### Token not generated
- Check if expo-notifications is properly installed
- Verify device capabilities (use expo-device)
- Check console for error messages
- Ensure network connectivity

## Additional Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin .NET SDK](https://firebase.google.com/docs/admin/setup)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Support

For issues with Firebase setup, contact the development team or check the project's issue tracker.