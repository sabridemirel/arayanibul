# Arayanibul MVP - User Acceptance Testing Guide

## Overview

This document provides comprehensive guidance for conducting User Acceptance Testing (UAT) for the Arayanibul MVP. The testing scenarios are designed to validate that the application meets business requirements and provides a satisfactory user experience.

## Test Environment Setup

### Prerequisites
- Backend API running on `http://localhost:5000`
- Mobile app accessible via Expo development server
- Test data populated using `scripts/prepare-test-data.sh`
- Test devices/emulators available

### Test Data
All test scenarios use pre-populated data. Refer to `test-data/test-data-summary.md` for complete test user credentials and data.

## User Acceptance Test Scenarios

### Scenario 1: New User Registration and Onboarding

**Objective**: Verify that new users can successfully register and complete onboarding.

**Test Steps**:
1. Open the mobile application
2. Tap "Kayıt Ol" (Register)
3. Fill in registration form:
   - Email: `newuser@test.com`
   - Password: `Test123!`
   - First Name: `Test`
   - Last Name: `User`
   - User Type: `Buyer`
4. Tap "Kayıt Ol" button
5. Verify successful registration and automatic login
6. Complete profile setup if prompted

**Expected Results**:
- ✅ Registration form validates input correctly
- ✅ User receives success message
- ✅ User is automatically logged in
- ✅ User is redirected to home screen
- ✅ Profile information is saved correctly

**Acceptance Criteria**: User can register and access the application within 2 minutes.

---

### Scenario 2: Social Login (Google/Facebook)

**Objective**: Verify social login functionality works correctly.

**Test Steps**:
1. Open the mobile application
2. Tap "Google ile Giriş" or "Facebook ile Giriş"
3. Complete OAuth flow in browser/popup
4. Return to application
5. Verify automatic profile creation

**Expected Results**:
- ✅ OAuth flow completes successfully
- ✅ User profile is created with social account data
- ✅ User is logged in automatically
- ✅ No duplicate accounts are created

**Acceptance Criteria**: Social login completes within 30 seconds.

---

### Scenario 3: Guest User Access

**Objective**: Verify guest users can browse content with limited functionality.

**Test Steps**:
1. Open the mobile application
2. Tap "Misafir Olarak Devam Et"
3. Browse available needs
4. Attempt to create a need (should be restricted)
5. Attempt to create an offer (should be restricted)

**Expected Results**:
- ✅ Guest can view needs and categories
- ✅ Guest cannot create needs or offers
- ✅ Guest is prompted to register for restricted actions
- ✅ Guest can convert to registered user

**Acceptance Criteria**: Guest experience is functional but appropriately limited.

---

### Scenario 4: Create and Manage Need (Buyer Journey)

**Objective**: Verify buyers can create, edit, and manage their needs effectively.

**Test Credentials**: `buyer1@test.com / Test123!`

**Test Steps**:
1. Login as buyer
2. Navigate to "İhtiyaç Oluştur"
3. Fill in need details:
   - Title: `Test UAT Need`
   - Description: `This is a test need for UAT`
   - Category: `Elektronik`
   - Budget: `1000-2000 TL`
   - Urgency: `Normal`
   - Location: Enable location or enter manually
4. Add photos (optional)
5. Submit need
6. View created need in "İhtiyaçlarım"
7. Edit the need
8. Delete the need

**Expected Results**:
- ✅ Form validation works correctly
- ✅ Need is created and visible immediately
- ✅ Photos upload successfully
- ✅ Need appears in user's need list
- ✅ Edit functionality works
- ✅ Delete functionality works with confirmation

**Acceptance Criteria**: Complete need lifecycle can be managed within 5 minutes.

---

### Scenario 5: Browse and Filter Needs (Provider Journey)

**Objective**: Verify providers can effectively discover relevant needs.

**Test Credentials**: `provider1@test.com / Test123!`

**Test Steps**:
1. Login as provider
2. Browse home screen needs
3. Use search functionality:
   - Search for "iPhone"
   - Search for "temizlik"
4. Apply filters:
   - Category filter (Elektronik)
   - Budget filter (20000-30000 TL)
   - Location filter (5km radius)
   - Urgency filter (Urgent only)
5. View need details
6. Check need location on map

**Expected Results**:
- ✅ Needs are displayed with relevant information
- ✅ Search returns accurate results
- ✅ Filters work correctly and can be combined
- ✅ Need details show complete information
- ✅ Location is displayed accurately
- ✅ Results update in real-time

**Acceptance Criteria**: Providers can find relevant needs within 1 minute using search/filters.

---

### Scenario 6: Create and Manage Offers (Provider Journey)

**Objective**: Verify providers can create competitive offers for needs.

**Test Credentials**: `provider2@test.com / Test123!`

**Test Steps**:
1. Login as provider
2. Find a need to bid on (use existing test need)
3. Tap "Teklif Ver"
4. Fill in offer details:
   - Price: `1500 TL`
   - Description: `High quality service with fast delivery`
   - Delivery Days: `2`
5. Add reference photos (optional)
6. Submit offer
7. View offer in "Tekliflerim"
8. Edit offer if still pending
9. Withdraw offer

**Expected Results**:
- ✅ Offer form validates input correctly
- ✅ Offer is submitted successfully
- ✅ Buyer receives notification (if enabled)
- ✅ Offer appears in provider's offer list
- ✅ Offer status is tracked correctly
- ✅ Edit/withdraw functionality works

**Acceptance Criteria**: Providers can create and manage offers within 3 minutes.

---

### Scenario 7: Review and Accept Offers (Buyer Journey)

**Objective**: Verify buyers can effectively evaluate and accept offers.

**Test Credentials**: `buyer1@test.com / Test123!`

**Test Steps**:
1. Login as buyer
2. Navigate to a need with offers
3. View all received offers
4. Compare offers by:
   - Price
   - Description
   - Delivery time
   - Provider rating
5. View provider profiles
6. Accept the best offer
7. Verify other offers are automatically rejected

**Expected Results**:
- ✅ All offers are displayed clearly
- ✅ Comparison is easy and intuitive
- ✅ Provider profiles show relevant information
- ✅ Accept action works immediately
- ✅ Other offers are marked as rejected
- ✅ Provider receives acceptance notification

**Acceptance Criteria**: Buyers can evaluate and accept offers within 2 minutes.

---

### Scenario 8: Real-time Messaging

**Objective**: Verify messaging system works reliably for buyer-provider communication.

**Test Credentials**: 
- Buyer: `buyer1@test.com / Test123!`
- Provider: `provider1@test.com / Test123!`

**Test Steps**:
1. Setup: Ensure there's an active offer between buyer and provider
2. **As Buyer**:
   - Navigate to offer and start conversation
   - Send text message: "Merhaba, detayları konuşabilir miyiz?"
   - Send location (if supported)
3. **As Provider** (use second device/browser):
   - Check for new message notification
   - Open conversation
   - Reply: "Tabii, ne zaman müsaitsiniz?"
   - Send photo (if supported)
4. **As Buyer**:
   - Verify real-time message receipt
   - Continue conversation
5. Test message history and read status

**Expected Results**:
- ✅ Messages are delivered in real-time
- ✅ Push notifications work (if enabled)
- ✅ Message history is preserved
- ✅ Read status is tracked
- ✅ Media sharing works
- ✅ Location sharing works

**Acceptance Criteria**: Messages are delivered within 2 seconds, conversation flows naturally.

---

### Scenario 9: Push Notifications

**Objective**: Verify push notification system works across different scenarios.

**Test Steps**:
1. Enable push notifications in device settings
2. **Test New Offer Notification**:
   - As provider, create offer for buyer's need
   - Verify buyer receives notification
3. **Test Offer Accepted Notification**:
   - As buyer, accept an offer
   - Verify provider receives notification
4. **Test New Message Notification**:
   - Send message in conversation
   - Verify recipient receives notification
5. **Test Notification Settings**:
   - Disable specific notification types
   - Verify notifications are not sent
   - Re-enable and test again

**Expected Results**:
- ✅ Notifications are received promptly
- ✅ Notification content is accurate
- ✅ Tapping notification opens relevant screen
- ✅ Notification settings work correctly
- ✅ No duplicate notifications

**Acceptance Criteria**: Notifications are delivered within 10 seconds and are actionable.

---

### Scenario 10: Profile Management and Reviews

**Objective**: Verify users can manage profiles and review system works.

**Test Steps**:
1. **Profile Management**:
   - Login and navigate to profile
   - Edit profile information
   - Upload/change profile photo
   - Update location and contact info
2. **Review System**:
   - Complete a transaction (accept offer)
   - Leave review for other party
   - View received reviews
   - Check rating calculation

**Expected Results**:
- ✅ Profile updates save correctly
- ✅ Photo upload works
- ✅ Reviews can be submitted
- ✅ Ratings are calculated accurately
- ✅ Review history is accessible

**Acceptance Criteria**: Profile management is intuitive, review system builds trust.

---

### Scenario 11: Search and Discovery

**Objective**: Verify search functionality helps users find relevant content.

**Test Steps**:
1. **Text Search**:
   - Search for "iPhone" - should return electronics needs
   - Search for "temizlik" - should return service needs
   - Search for non-existent items
2. **Advanced Filtering**:
   - Combine multiple filters
   - Test edge cases (very high/low budgets)
   - Test location-based filtering
3. **Recommendations**:
   - Check "Öneriler" section
   - Verify recommendations are relevant
4. **Popular Needs**:
   - Check popular/trending needs
   - Verify sorting by activity

**Expected Results**:
- ✅ Search returns relevant results
- ✅ Filters work correctly in combination
- ✅ No results state is handled gracefully
- ✅ Recommendations are personalized
- ✅ Popular content is highlighted

**Acceptance Criteria**: Users can find relevant content within 30 seconds.

---

### Scenario 12: Error Handling and Edge Cases

**Objective**: Verify application handles errors gracefully.

**Test Steps**:
1. **Network Issues**:
   - Disable internet connection
   - Try to perform actions
   - Re-enable connection
2. **Invalid Input**:
   - Submit forms with invalid data
   - Test field validation
3. **Authentication Issues**:
   - Use expired tokens
   - Test logout/login flow
4. **Server Errors**:
   - Test with backend temporarily down
   - Verify error messages

**Expected Results**:
- ✅ Offline state is handled gracefully
- ✅ Form validation prevents invalid submissions
- ✅ Error messages are user-friendly
- ✅ App recovers when connection is restored
- ✅ No crashes or data loss

**Acceptance Criteria**: Application remains stable and provides clear feedback during error conditions.

---

## Performance Acceptance Criteria

### Response Times
- **Authentication**: < 2 seconds
- **Need/Offer Creation**: < 3 seconds
- **Search Results**: < 1 second
- **Message Delivery**: < 2 seconds
- **Image Upload**: < 5 seconds

### User Experience
- **App Launch Time**: < 3 seconds
- **Screen Transitions**: < 500ms
- **Form Submission**: < 2 seconds

### Reliability
- **Uptime**: 99%+ during testing period
- **Data Consistency**: 100%
- **Message Delivery**: 99%+

## Test Completion Criteria

### Functional Requirements
- [ ] All 12 test scenarios pass
- [ ] No critical bugs identified
- [ ] All user workflows complete successfully
- [ ] Performance criteria met

### User Experience Requirements
- [ ] Navigation is intuitive
- [ ] Error messages are helpful
- [ ] Loading states are appropriate
- [ ] Responsive design works on different screen sizes

### Business Requirements
- [ ] Core marketplace functionality works
- [ ] User onboarding is smooth
- [ ] Trust and safety features function
- [ ] Monetization hooks are in place

## Test Reporting

### Daily Test Summary Template
```
Date: [Date]
Tester: [Name]
Environment: [Test Environment]

Scenarios Completed: X/12
Pass Rate: X%

Critical Issues: X
Major Issues: X
Minor Issues: X

Notes:
- [Key observations]
- [User feedback]
- [Recommendations]
```

### Final UAT Report Template
```
# Arayanibul MVP - UAT Final Report

## Executive Summary
[Overall assessment of readiness for production]

## Test Results Summary
- Total Scenarios: 12
- Passed: X
- Failed: X
- Pass Rate: X%

## Performance Results
[Performance metrics vs. acceptance criteria]

## Critical Issues
[List of critical issues that must be resolved]

## Recommendations
[Recommendations for production readiness]

## Sign-off
[Stakeholder approval for production deployment]
```

## Post-UAT Activities

1. **Bug Triage**: Prioritize and assign identified issues
2. **Performance Optimization**: Address any performance gaps
3. **Documentation Updates**: Update user guides based on testing feedback
4. **Production Deployment Planning**: Prepare deployment checklist
5. **User Training**: Prepare materials for end-user training

## Contact Information

For UAT support and issue reporting:
- **Technical Issues**: [Development Team Contact]
- **Business Questions**: [Product Owner Contact]
- **Test Coordination**: [QA Team Contact]

---

*This document should be reviewed and updated based on actual UAT results and feedback.*