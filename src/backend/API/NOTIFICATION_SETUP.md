# Push Notification Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Arayanibul backend.

## Prerequisites

1. A Firebase project
2. Firebase Admin SDK service account key
3. Mobile app configured with Firebase

## Setup Steps

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Cloud Messaging in the project

### 2. Generate Service Account Key

1. In Firebase Console, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in the `src/backend/API/` directory

### 3. Update Configuration

Update `appsettings.json` with your Firebase project details:

```json
{
  "Firebase": {
    "ServiceAccountKeyPath": "firebase-service-account.json",
    "ProjectId": "your-firebase-project-id"
  }
}
```

### 4. Mobile App Integration

The mobile app needs to:

1. Initialize Firebase SDK
2. Request notification permissions
3. Get FCM token
4. Send token to backend via `/api/notification/device-token` endpoint

## API Endpoints

### Device Token Management
- `POST /api/notification/device-token` - Register device token
- `PUT /api/notification/preferences` - Update notification preferences
- `GET /api/notification/preferences` - Get notification preferences

### Notification Management
- `GET /api/notification` - Get user notifications (paginated)
- `GET /api/notification/stats` - Get notification statistics
- `GET /api/notification/unread-count` - Get unread count
- `PUT /api/notification/{id}/read` - Mark notification as read
- `PUT /api/notification/read-all` - Mark all notifications as read
- `DELETE /api/notification/{id}` - Delete notification

### Testing
- `POST /api/notification/test` - Send test notification

## Notification Types

The system supports the following notification types:

- `new_offer` - New offer received
- `offer_accepted` - Offer was accepted
- `offer_rejected` - Offer was rejected
- `offer_withdrawn` - Offer was withdrawn
- `new_message` - New message received
- `system` - System notifications

## User Preferences

Users can control which types of notifications they receive:

- `EnablePushNotifications` - Master switch for all push notifications
- `EnableOfferNotifications` - Offer-related notifications
- `EnableMessageNotifications` - Message notifications
- `EnableSystemNotifications` - System notifications

## Development Notes

- If Firebase is not configured, notifications will be logged only
- Invalid device tokens are automatically removed from user profiles
- Notifications are stored in the database for history
- Platform-specific configurations are applied (iOS/Android)

## Security

- Keep the service account key file secure and never commit it to version control
- The key file is already added to `.gitignore`
- Use environment variables for production deployments

## Troubleshooting

1. **Firebase not initialized**: Check service account key path and permissions
2. **Invalid token errors**: Device tokens are automatically cleaned up
3. **No notifications received**: Check user preferences and device token registration
4. **Build errors**: Ensure FirebaseAdmin package is installed

## Testing

Use the test endpoint to verify push notifications:

```bash
curl -X POST "https://your-api/api/notification/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test notification",
    "data": {"type": "test"}
  }'
```