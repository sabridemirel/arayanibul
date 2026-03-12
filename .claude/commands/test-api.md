Run a comprehensive API health check for the Arayanibul backend.

Launch the **arayanibul-qa-tester** agent to perform the following tests against http://localhost:5001.

Ask it to:

## Endpoints to Test

### 1. Swagger / Health
- `GET http://localhost:5001/swagger/v1/swagger.json`
- Expected: 200 OK

### 2. Guest Authentication
- `POST http://localhost:5001/api/auth/guest`
- Expected: 200 OK with a `token` field
- Save the token for all subsequent requests

### 3. Email Registration
- `POST http://localhost:5001/api/auth/register`
- Body: `{ "email": "test@arayanibul.com", "password": "Test1234!", "firstName": "Test", "lastName": "User" }`
- Expected: 200 OK with token

### 4. Categories
- `GET http://localhost:5001/api/categories`
- Expected: 200 OK with non-empty array of categories

### 5. Needs (Listings)
- `GET http://localhost:5001/api/needs?page=1&pageSize=10`
- Expected: 200 OK with paginated result

### 6. Create a Need
- `POST http://localhost:5001/api/needs`
- Auth: Bearer token from step 2
- Body: `{ "title": "Test İhtiyacı", "description": "API test için oluşturuldu", "categoryId": 1, "budget": 100, "urgency": "Normal" }`
- Expected: 201 Created

### 7. Recommendations
- `GET http://localhost:5001/api/recommendations`
- Auth: Bearer token
- Expected: 200 OK

### 8. User Profile
- `GET http://localhost:5001/api/users/me`
- Auth: Bearer token
- Expected: 200 OK with user data

## Output Format

Print a results table:
| # | Endpoint | Status Code | Result | Notes |
|---|----------|-------------|--------|-------|
| 1 | Swagger  | 200         | ✅     |       |
| 2 | Guest Login | 200      | ✅     |       |
...

Then provide:
- Overall: X/8 tests passed
- Any failures with details
- Recommended fix if something is failing

If the backend is not running, report that and suggest running `/start-dev` first.
