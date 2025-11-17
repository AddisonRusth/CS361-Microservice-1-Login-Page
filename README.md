Auth Service Integration Guide
What this microservice does The auth microservice runs as a separate server at: https://localhost:5047\ It exposes a REST API with the following endpoints:
POST /auth/register – Create users POST /auth/login – Log in, returns tokens POST /auth/refresh – Refresh access token GET /auth/me – Check who is logged in

Important: Your project only needs to call these endpoints; you don't need to modify its internal code. 2. Start the auth microservice Navigate to the auth-service folder and follow these steps: Install dependencies

npm install
Create HTTPS certificates (one-time setup)

mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
-keyout certs/key.pem \
-out certs/cert.pem \
-days 365 \
-subj "/CN=localhost"
Run the service

npm run dev
You should see:

Auth service listening on https://localhost:5047
⚠️ If you don't see that line, the service is not running correctly. 3. Create at least one user From any terminal (while the service is running):

curl -k -X POST https://localhost:5047/auth/register \
-H "Content-Type: application/json" \
-d '{"email":"test@example.org","password":"password123"}'
Now you have a valid user:

Email: test@example.org Password: password123

Note: Your app can also call this endpoint to let real users sign up.

What your webapp needs to do (frontend) Your frontend framework doesn't matter (React, plain HTML/JS, Vue, etc.). Follow these three steps: 4.1 Add a login form Create a form with:
Email input field Password input field Login button

4.2 On login submit, call the microservice When the user clicks Login or submits the form, send a POST request:

URL: https://localhost:5047/auth/login\ Method: POST Headers: Content-Type: application/json Body (JSON):

{
"email": "test@example.org",
"password": "password123"
}
Successful response:

{
"access_token": "...",
"refresh_token": "...",
"expires_in": 900,
"token_type": "Bearer"
}
4.3 Store the tokens Your webapp must store at least:

access_token refresh_token

Common approach: Use localStorage in browser apps to save these tokens for later use. 5. How your webapp uses the token Whenever your app calls its own backend or any protected endpoint:

Read the stored access_token Add this header to the request:

Authorization: Bearer <access_token>
Examples:

GET /api/patients
GET /api/logs
POST /api/something
All protected requests should include the Authorization: Bearer ... header. 6. (Optional) What your backend should do If you have a backend (Node, Python, etc.), it should:

Read the Authorization header from incoming requests Extract the token (Bearer <access_token>) Validate it using one of these methods:

Call GET https://localhost:5047/auth/me\ with that token, OR Use the JWKS endpoint GET https://localhost:5047/.well-known/jwks.json\ with a JWT library

Authorization logic:

If the token is valid → Allow the request If not valid → Respond with 401 Unauthorized

(Optional) Refreshing tokens When the access token expires, get a new one without requiring user login:
Endpoint: POST /auth/refresh Body:

{
"refresh_token": "<their stored refresh token>"
}
The response includes a new access_token (and possibly new expiry time). 8. Quick Start Checklist

Run auth-service

npm install Create certs (one-time) npm run dev → verify "Auth service listening..." appears

Create a user with POST /auth/register Add a login form in your webapp (email + password) On submit, send POST /auth/login to https://localhost:5047/auth/login\ Store access_token and refresh_token Include Authorization: Bearer <access_token> on any protected request (Optional) Use POST /auth/refresh for automatic token refresh

Summary: If your webapp can send HTTP requests, it can use this microservice!`;
