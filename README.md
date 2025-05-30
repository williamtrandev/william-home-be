# William Home Backend

A backend service for managing house expenses and settlements with Google OAuth2 authentication.

## Features

-   Google OAuth2 authentication
-   House management with member invitations
-   Expense tracking and management
-   Automatic expense settlement calculation
-   Email notifications for invitations

## Prerequisites

-   Node.js (v14 or higher)
-   MongoDB
-   Google Cloud project with OAuth2 enabled
-   Gmail account for sending emails

## Setup

1. Clone the repository
2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory with the following variables:

    ```
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/william-home
    JWT_SECRET=your_jwt_secret_key
    JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
    GOOGLE_CLIENT_ID=your_google_client_id
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_app_password
    FRONTEND_URL=http://localhost:3000
    ```

4. Set up Google OAuth2:

    - Go to Google Cloud Console
    - Create a new project
    - Enable Google OAuth2 API
    - Configure OAuth consent screen
    - Create OAuth 2.0 Client ID
    - Add authorized JavaScript origins and redirect URIs
    - Copy Client ID to .env file

5. Set up Gmail for sending emails:
    - Enable 2-factor authentication
    - Generate an App Password
    - Use the App Password in EMAIL_PASS

## Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Authentication

-   `POST /api/auth/login/google` - Login with Google OAuth2
-   `POST /api/auth/refresh-token` - Refresh JWT token
-   `GET /api/auth/me` - Get current user info
-   `PUT /api/auth/profile` - Update user profile
-   `POST /api/auth/invite` - Invite user to house
-   `POST /api/auth/join/:token` - Accept house invitation
-   `POST /api/auth/reject/:token` - Reject house invitation

### Houses

-   `POST /api/houses` - Create new house
-   `GET /api/houses/my-houses` - Get user's houses
-   `GET /api/houses/:id` - Get house details

### Expenses

-   `POST /api/expenses` - Create new expense
-   `GET /api/expenses/house/:houseId` - Get house expenses
-   `PUT /api/expenses/:id` - Update expense
-   `POST /api/expenses/house/:houseId/settle` - Settle house expenses

## Security

-   All routes except authentication are protected with JWT
-   Google OAuth2 for secure authentication
-   Email verification for house invitations
-   Role-based access control for house operations
