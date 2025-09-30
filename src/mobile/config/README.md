# Firebase Configuration Files

This directory contains Firebase configuration files needed for push notifications and other Firebase services.

## Setup Instructions

1. Follow the detailed setup guide: `../FIREBASE_SETUP.md`

2. Download your Firebase config files:
   - **Android**: Download `google-services.json` from Firebase Console
   - **iOS**: Download `GoogleService-Info.plist` from Firebase Console

3. Place the files in this directory:
   ```
   src/mobile/config/
   ├── google-services.json          (Android - from Firebase)
   ├── GoogleService-Info.plist      (iOS - from Firebase)
   ├── google-services.json.example  (Template reference)
   └── GoogleService-Info.plist.example (Template reference)
   ```

4. The actual config files (`google-services.json` and `GoogleService-Info.plist`) are gitignored and should NOT be committed to the repository.

## File Descriptions

- **google-services.json**: Android Firebase configuration
  - Contains Android app credentials
  - Required for FCM (Firebase Cloud Messaging) on Android
  - Download from: Firebase Console > Project Settings > General > Your apps > Android app

- **GoogleService-Info.plist**: iOS Firebase configuration
  - Contains iOS app credentials
  - Required for FCM on iOS via APNs
  - Download from: Firebase Console > Project Settings > General > Your apps > iOS app

- **\*.example files**: Template files showing the structure
  - Use these as reference
  - Replace placeholder values with your actual Firebase project values
  - Safe to commit to git

## Security

- NEVER commit actual Firebase configuration files to git
- Share these files securely with team members (e.g., via secure password manager)
- Use different Firebase projects for development, staging, and production
- Rotate credentials if they are accidentally exposed

## Troubleshooting

If you're having issues with Firebase:

1. Verify files are in the correct location
2. Check that package names/bundle IDs match your app configuration
3. Ensure Firebase project is properly configured
4. Review `../FIREBASE_SETUP.md` for detailed troubleshooting steps

## For Development Without Firebase

If you're developing without Firebase integration:

1. The app will work without these files for local development
2. Push notifications will not function
3. Other Firebase services will be unavailable
4. Consider using Expo's push notification service for testing