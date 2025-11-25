AUTH_MICROSERVICE_README.md
# Auth Microservice – Communication Contract & Integration Guide

This document defines the **fixed communication contract** between the Auth Microservice and any teammates' projects.  

---

## 1. Communication Contract (Do Not Change)

The Auth Microservice communicates **exclusively via a REST API over HTTPS**.

Base URL:
```
https://localhost:5047
```

Your project interacts with it by sending JSON requests, and the microservice responds with JSON objects.

### Supported Endpoints:

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/auth/register` | POST | Create a new user |
| `/auth/login` | POST | Log in; returns access + refresh token |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/me` | GET | Validate access token & fetch user info |
| `/.well-known/jwks.json` | GET | Public signing keys for backend verification |

### Required Request Format (All Requests)

All requests **must** include:
```
Content-Type: application/json
```

All protected requests **must** include:
```
Authorization: Bearer <access_token>
```

### Required Response Format

All responses are JSON objects.  
Errors follow this format:
```
json
{
  "error": "Error message here"
}
```
### CORS Policy
Only local development origins are allowed:
```
http://localhost:<any_port>
```
## 2. How to Programmatically REQUEST Data from the Microservice

Your project can use any language.
Below is the official example using JavaScript fetch().

### Example: LOGIN Request (POST /auth/login)
```
const response = await fetch("https://localhost:5047/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "test@example.org",
    password: "password123"
  })
});
```
## 3. How to Programmatically RECEIVE Data
```
'const data = await response.json();

if (!response.ok) {
  console.error("Login failed:", data.error);
} else {
  console.log("Access Token:", data.access_token);
  console.log("Refresh Token:", data.refresh_token);

  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
}'
```
Expected successful response:
```
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGc.....",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

## 4 UML Sequence Diagram (Requesting & Receiving Data)


<img width="1826" height="756" alt="Screenshot 2025-11-24 224215" src="https://github.com/user-attachments/assets/9c6c0111-e5e9-49c1-9fd8-2a17552caf40" />


## 5. Summary for Teammates

To integrate this microservice:

Send REST requests to https://localhost:5047

Use JSON for all requests<

Parse JSON responses

Store access_token & refresh_token

Attach Authorization: Bearer <token> to secure routes

Do not modify this communication contract
