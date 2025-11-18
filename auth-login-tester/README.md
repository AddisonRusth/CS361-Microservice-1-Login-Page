# Auth Login Tester (React)

This is a **small React app** that tests the Auth Microservice.

It sends a login request to:

`https://localhost:5047/auth/login`

and saves the returned tokens in `localStorage`.

---

## Requirements

- Node.js (v18+ or v20+ recommended)
- npm

You also need the **Auth Microservice** running locally on:

`https://localhost:5047`

---

## Setup

1. Clone this repo:

   ```bash
   git clone <this-repo-url>.git
   cd auth-login-tester

## Install Dependencies
```
npm install
```
## Start the React Server
```
npm run dev
```
## Open the URL shown in the terminal (usually http://localhost:5173).

# Using the Tester
### Make sure the auth microservice is running on:
```
https://localhost:5047 
```

## Make sure you have one registered user:
```
curl -k -X POST https://localhost:5047/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.org","password":"password123"}'
```

## In the React app, enter:

Email: test@example.org

Password: password123

Click Log In.

## On success, the app will show:

Success! Tokens saved to localStorage.

And your browser will now have:

localStorage["access_token"]

localStorage["refresh_token"]