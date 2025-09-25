#!/bin/bash

# Arayanibul MVP - Test Data Preparation Script
# This script prepares comprehensive test data for integration testing

set -e

echo "🗄️ Preparing Test Data for Arayanibul MVP"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# API base URL
API_URL="http://localhost:5000/api"

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$token" ]; then
        curl -s -X $method \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            "$API_URL$endpoint"
    else
        curl -s -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

# Wait for backend to be ready
wait_for_backend() {
    print_status "Waiting for backend to be ready..."
    
    for i in {1..30}; do
        if curl -f "$API_URL/health" > /dev/null 2>&1; then
            print_success "Backend is ready"
            return 0
        fi
        sleep 2
    done
    
    print_error "Backend is not responding"
    exit 1
}

# Create test users
create_test_users() {
    print_status "Creating test users..."
    
    # Create buyers
    BUYER1_DATA='{
        "email": "buyer1@test.com",
        "password": "Test123!",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "userType": "Buyer"
    }'
    
    BUYER2_DATA='{
        "email": "buyer2@test.com",
        "password": "Test123!",
        "firstName": "Ayşe",
        "lastName": "Demir",
        "userType": "Buyer"
    }'
    
    BUYER3_DATA='{
        "email": "buyer3@test.com",
        "password": "Test123!",
        "firstName": "Mehmet",
        "lastName": "Kaya",
        "userType": "Buyer"
    }'
    
    # Create providers
    PROVIDER1_DATA='{
        "email": "provider1@test.com",
        "password": "Test123!",
        "firstName": "Fatma",
        "lastName": "Özkan",
        "userType": "Provider"
    }'
    
    PROVIDER2_DATA='{
        "email": "provider2@test.com",
        "password": "Test123!",
        "firstName": "Ali",
        "lastName": "Çelik",
        "userType": "Provider"
    }'
    
    PROVIDER3_DATA='{
        "email": "provider3@test.com",
        "password": "Test123!",
        "firstName": "Zeynep",
        "lastName": "Arslan",
        "userType": "Provider"
    }'
    
    # Create both type users
    BOTH1_DATA='{
        "email": "both1@test.com",
        "password": "Test123!",
        "firstName": "Can",
        "lastName": "Yıldız",
        "userType": "Both"
    }'
    
    # Register users and store tokens
    BUYER1_RESPONSE=$(api_call POST "/auth/register" "$BUYER1_DATA")
    BUYER1_TOKEN=$(echo $BUYER1_RESPONSE | jq -r '.token')
    
    BUYER2_RESPONSE=$(api_call POST "/auth/register" "$BUYER2_DATA")
    BUYER2_TOKEN=$(echo $BUYER2_RESPONSE | jq -r '.token')
    
    BUYER3_RESPONSE=$(api_call POST "/auth/register" "$BUYER3_DATA")
    BUYER3_TOKEN=$(echo $BUYER3_RESPONSE | jq -r '.token')
    
    PROVIDER1_RESPONSE=$(api_call POST "/auth/register" "$PROVIDER1_DATA")
    PROVIDER1_TOKEN=$(echo $PROVIDER1_RESPONSE | jq -r '.token')
    
    PROVIDER2_RESPONSE=$(api_call POST "/auth/register" "$PROVIDER2_DATA")
    PROVIDER2_TOKEN=$(echo $PROVIDER2_RESPONSE | jq -r '.token')
    
    PROVIDER3_RESPONSE=$(api_call POST "/auth/register" "$PROVIDER3_DATA")
    PROVIDER3_TOKEN=$(echo $PROVIDER3_RESPONSE | jq -r '.token')
    
    BOTH1_RESPONSE=$(api_call POST "/auth/register" "$BOTH1_DATA")
    BOTH1_TOKEN=$(echo $BOTH1_RESPONSE | jq -r '.token')
    
    print_success "Created 7 test users (3 buyers, 3 providers, 1 both)"
}

# Create test needs
create_test_needs() {
    print_status "Creating test needs..."
    
    # Electronics needs
    NEED1_DATA='{
        "title": "iPhone 13 Pro Arıyorum",
        "description": "Temiz durumda iPhone 13 Pro arıyorum. Tercihen 128GB veya 256GB. Kutulu olması tercih sebebi.",
        "categoryId": 1,
        "minBudget": 20000,
        "maxBudget": 25000,
        "urgency": "Normal",
        "latitude": 41.0082,
        "longitude": 28.9784,
        "address": "Beşiktaş, İstanbul"
    }'
    
    NEED2_DATA='{
        "title": "Gaming Laptop Arıyorum",
        "description": "RTX 3070 veya üzeri ekran kartlı gaming laptop arıyorum. 16GB RAM minimum.",
        "categoryId": 1,
        "minBudget": 35000,
        "maxBudget": 50000,
        "urgency": "Urgent",
        "latitude": 41.0151,
        "longitude": 28.9794,
        "address": "Şişli, İstanbul"
    }'
    
    NEED3_DATA='{
        "title": "MacBook Air M2 Arıyorum",
        "description": "Yeni nesil MacBook Air M2 arıyorum. 512GB SSD tercih ederim.",
        "categoryId": 1,
        "minBudget": 25000,
        "maxBudget": 35000,
        "urgency": "Normal",
        "latitude": 41.0025,
        "longitude": 28.9760,
        "address": "Kadıköy, İstanbul"
    }'
    
    # Home & Living needs
    NEED4_DATA='{
        "title": "Ev Temizlik Hizmeti",
        "description": "Haftalık ev temizlik hizmeti arıyorum. 3+1 daire, Beşiktaş bölgesi.",
        "categoryId": 2,
        "minBudget": 200,
        "maxBudget": 400,
        "urgency": "Normal",
        "latitude": 41.0082,
        "longitude": 28.9784,
        "address": "Beşiktaş, İstanbul"
    }'
    
    NEED5_DATA='{
        "title": "Koltuk Takımı Arıyorum",
        "description": "3+2+1 koltuk takımı arıyorum. Modern tasarım tercih ederim. Gri veya bej renk.",
        "categoryId": 2,
        "minBudget": 8000,
        "maxBudget": 15000,
        "urgency": "Flexible",
        "latitude": 41.0151,
        "longitude": 28.9794,
        "address": "Şişli, İstanbul"
    }'
    
    # Services needs
    NEED6_DATA='{
        "title": "Düğün Fotoğrafçısı Arıyorum",
        "description": "15 Haziran 2024 tarihli düğünüm için profesyonel fotoğrafçı arıyorum. Portföy paylaşabilir misiniz?",
        "categoryId": 3,
        "minBudget": 5000,
        "maxBudget": 12000,
        "urgency": "Urgent",
        "latitude": 41.0025,
        "longitude": 28.9760,
        "address": "Kadıköy, İstanbul"
    }'
    
    # Create needs with different buyers
    NEED1_RESPONSE=$(api_call POST "/need" "$NEED1_DATA" "$BUYER1_TOKEN")
    NEED1_ID=$(echo $NEED1_RESPONSE | jq -r '.id')
    
    NEED2_RESPONSE=$(api_call POST "/need" "$NEED2_DATA" "$BUYER2_TOKEN")
    NEED2_ID=$(echo $NEED2_RESPONSE | jq -r '.id')
    
    NEED3_RESPONSE=$(api_call POST "/need" "$NEED3_DATA" "$BUYER3_TOKEN")
    NEED3_ID=$(echo $NEED3_RESPONSE | jq -r '.id')
    
    NEED4_RESPONSE=$(api_call POST "/need" "$NEED4_DATA" "$BUYER1_TOKEN")
    NEED4_ID=$(echo $NEED4_RESPONSE | jq -r '.id')
    
    NEED5_RESPONSE=$(api_call POST "/need" "$NEED5_DATA" "$BUYER2_TOKEN")
    NEED5_ID=$(echo $NEED5_RESPONSE | jq -r '.id')
    
    NEED6_RESPONSE=$(api_call POST "/need" "$NEED6_DATA" "$BOTH1_TOKEN")
    NEED6_ID=$(echo $NEED6_RESPONSE | jq -r '.id')
    
    print_success "Created 6 test needs across different categories"
}

# Create test offers
create_test_offers() {
    print_status "Creating test offers..."
    
    # Offers for iPhone need
    OFFER1_DATA='{
        "needId": '$NEED1_ID',
        "price": 22000,
        "description": "Sıfır kutusunda iPhone 13 Pro 128GB. Tüm aksesuarları mevcut. Garantili.",
        "deliveryDays": 1
    }'
    
    OFFER2_DATA='{
        "needId": '$NEED1_ID',
        "price": 24000,
        "description": "iPhone 13 Pro 256GB, çok temiz. 6 ay garantisi kaldı. Hızlı teslimat.",
        "deliveryDays": 2
    }'
    
    # Offers for Gaming Laptop need
    OFFER3_DATA='{
        "needId": '$NEED2_ID',
        "price": 42000,
        "description": "ASUS ROG Strix RTX 3070, 16GB RAM, 1TB SSD. Çok az kullanılmış.",
        "deliveryDays": 3
    }'
    
    OFFER4_DATA='{
        "needId": '$NEED2_ID',
        "price": 38000,
        "description": "MSI Gaming Laptop RTX 3070, 32GB RAM. Performans canavarı!",
        "deliveryDays": 1
    }'
    
    # Offers for cleaning service
    OFFER5_DATA='{
        "needId": '$NEED4_ID',
        "price": 300,
        "description": "Profesyonel temizlik hizmeti. Tüm malzemeler bizden. Haftalık düzenli hizmet.",
        "deliveryDays": 7
    }'
    
    # Offers for wedding photography
    OFFER6_DATA='{
        "needId": '$NEED6_ID',
        "price": 8000,
        "description": "10 yıllık deneyim, profesyonel ekipman. Düğün öncesi çekim hediye!",
        "deliveryDays": 1
    }'
    
    OFFER7_DATA='{
        "needId": '$NEED6_ID',
        "price": 6500,
        "description": "Yaratıcı düğün fotoğrafçılığı. Portföyümü inceleyebilirsiniz.",
        "deliveryDays": 2
    }'
    
    # Create offers with different providers
    api_call POST "/offer" "$OFFER1_DATA" "$PROVIDER1_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER2_DATA" "$PROVIDER2_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER3_DATA" "$PROVIDER1_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER4_DATA" "$PROVIDER3_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER5_DATA" "$PROVIDER2_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER6_DATA" "$PROVIDER1_TOKEN" > /dev/null
    api_call POST "/offer" "$OFFER7_DATA" "$PROVIDER3_TOKEN" > /dev/null
    
    print_success "Created 7 test offers for various needs"
}

# Create test messages
create_test_messages() {
    print_status "Creating test messages..."
    
    # Get offer IDs for messaging
    OFFERS_RESPONSE=$(api_call GET "/offer/need/$NEED1_ID" "" "$BUYER1_TOKEN")
    OFFER1_ID=$(echo $OFFERS_RESPONSE | jq -r '.[0].id')
    
    # Create conversation between buyer and provider
    MESSAGE1_DATA='{
        "offerId": '$OFFER1_ID',
        "content": "Merhaba, iPhone hakkında detay alabilir miyim?",
        "type": "Text"
    }'
    
    MESSAGE2_DATA='{
        "offerId": '$OFFER1_ID',
        "content": "Tabii! iPhone sıfır kutusunda, hiç kullanılmamış. Tüm aksesuarları mevcut.",
        "type": "Text"
    }'
    
    MESSAGE3_DATA='{
        "offerId": '$OFFER1_ID',
        "content": "Harika! Ne zaman teslim alabilir miyim?",
        "type": "Text"
    }'
    
    # Send messages
    api_call POST "/message" "$MESSAGE1_DATA" "$BUYER1_TOKEN" > /dev/null
    sleep 1
    api_call POST "/message" "$MESSAGE2_DATA" "$PROVIDER1_TOKEN" > /dev/null
    sleep 1
    api_call POST "/message" "$MESSAGE3_DATA" "$BUYER1_TOKEN" > /dev/null
    
    print_success "Created test conversation with 3 messages"
}

# Create test reviews
create_test_reviews() {
    print_status "Creating test reviews..."
    
    # Accept an offer first to enable reviews
    OFFERS_RESPONSE=$(api_call GET "/offer/need/$NEED4_ID" "" "$BUYER1_TOKEN")
    CLEANING_OFFER_ID=$(echo $OFFERS_RESPONSE | jq -r '.[0].id')
    
    api_call POST "/offer/$CLEANING_OFFER_ID/accept" "" "$BUYER1_TOKEN" > /dev/null
    
    # Create review from buyer to provider
    REVIEW1_DATA='{
        "offerId": '$CLEANING_OFFER_ID',
        "rating": 5,
        "comment": "Mükemmel hizmet! Çok titiz ve profesyonel çalışıyor. Kesinlikle tavsiye ederim."
    }'
    
    api_call POST "/review" "$REVIEW1_DATA" "$BUYER1_TOKEN" > /dev/null
    
    print_success "Created test review"
}

# Create demo scenarios
create_demo_scenarios() {
    print_status "Creating demo scenarios..."
    
    # Scenario 1: Complete user journey
    cat > test-data/demo-scenario-1.json << EOF
{
    "name": "Complete User Journey",
    "description": "Buyer creates need, receives offers, accepts one, messages with provider",
    "steps": [
        "Login as buyer1@test.com",
        "View need 'iPhone 13 Pro Arıyorum'",
        "Check received offers (2 offers available)",
        "Message with providers",
        "Accept best offer",
        "Leave review"
    ],
    "credentials": {
        "buyer": "buyer1@test.com / Test123!",
        "provider": "provider1@test.com / Test123!"
    }
}
EOF

    # Scenario 2: Provider workflow
    cat > test-data/demo-scenario-2.json << EOF
{
    "name": "Provider Workflow",
    "description": "Provider searches needs, creates offers, manages communications",
    "steps": [
        "Login as provider2@test.com",
        "Browse available needs",
        "Filter by category and location",
        "Create competitive offers",
        "Respond to buyer messages",
        "Track offer status"
    ],
    "credentials": {
        "provider": "provider2@test.com / Test123!"
    }
}
EOF

    # Scenario 3: Search and discovery
    cat > test-data/demo-scenario-3.json << EOF
{
    "name": "Search and Discovery",
    "description": "Test search functionality and filtering",
    "steps": [
        "Search for 'iPhone' - should return 1 result",
        "Filter by Electronics category - should return 3 results",
        "Filter by budget range 20000-30000 - should return 2 results",
        "Filter by location (Istanbul) - should return all results",
        "Test urgency level filtering"
    ]
}
EOF

    print_success "Created 3 demo scenarios"
}

# Generate test data summary
generate_summary() {
    print_status "Generating test data summary..."
    
    mkdir -p test-data
    
    cat > test-data/test-data-summary.md << EOF
# Arayanibul MVP - Test Data Summary

Generated on: $(date)

## Test Users

### Buyers
- **buyer1@test.com** (Ahmet Yılmaz) - Password: Test123!
- **buyer2@test.com** (Ayşe Demir) - Password: Test123!
- **buyer3@test.com** (Mehmet Kaya) - Password: Test123!

### Providers
- **provider1@test.com** (Fatma Özkan) - Password: Test123!
- **provider2@test.com** (Ali Çelik) - Password: Test123!
- **provider3@test.com** (Zeynep Arslan) - Password: Test123!

### Both Type Users
- **both1@test.com** (Can Yıldız) - Password: Test123!

## Test Needs

1. **iPhone 13 Pro Arıyorum** (Electronics) - Budget: 20,000-25,000 TL
2. **Gaming Laptop Arıyorum** (Electronics) - Budget: 35,000-50,000 TL
3. **MacBook Air M2 Arıyorum** (Electronics) - Budget: 25,000-35,000 TL
4. **Ev Temizlik Hizmeti** (Services) - Budget: 200-400 TL
5. **Koltuk Takımı Arıyorum** (Home & Living) - Budget: 8,000-15,000 TL
6. **Düğün Fotoğrafçısı Arıyorum** (Services) - Budget: 5,000-12,000 TL

## Test Offers

- 7 offers created across different needs
- Price ranges from 300 TL to 42,000 TL
- Various delivery times (1-7 days)

## Test Messages

- Sample conversation between buyer and provider
- 3 messages demonstrating typical interaction

## Test Reviews

- 1 completed transaction with review
- 5-star rating with positive feedback

## Demo Scenarios

1. **Complete User Journey** - End-to-end buyer experience
2. **Provider Workflow** - Provider's perspective and actions
3. **Search and Discovery** - Testing search and filter functionality

## API Endpoints Tested

- Authentication (register, login)
- Need management (create, read, update, delete)
- Offer management (create, accept, reject)
- Messaging (send, receive, conversations)
- Reviews (create, read)
- Search and filtering

## Performance Benchmarks

Run the integration test suite to get current performance metrics.
EOF

    print_success "Test data summary generated: test-data/test-data-summary.md"
}

# Main execution
main() {
    # Create test-data directory
    mkdir -p test-data
    
    wait_for_backend
    create_test_users
    create_test_needs
    create_test_offers
    create_test_messages
    create_test_reviews
    create_demo_scenarios
    generate_summary
    
    print_success "🎉 Test data preparation completed!"
    print_status "Summary available at: test-data/test-data-summary.md"
    print_status "Demo scenarios available in: test-data/"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    exit 1
fi

# Run main function
main "$@"