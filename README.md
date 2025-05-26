# William Home Backend

A backend service for managing house expenses and settlements with Google authentication.

## Features

-   Google OAuth authentication
-   House management with member invitations
-   Expense tracking and management
-   Automatic expense settlement calculation
-   Email notifications for invitations

## Prerequisites

-   Node.js (v14 or higher)
-   MongoDB
-   Google OAuth credentials
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
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_app_password
    FRONTEND_URL=http://localhost:3000
    ```

4. Set up Google OAuth:

    - Go to Google Cloud Console
    - Create a new project
    - Enable Google+ API
    - Create OAuth 2.0 credentials
    - Add authorized redirect URIs
    - Copy Client ID and Client Secret to .env file

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

-   `GET /auth/google` - Initiate Google OAuth login
-   `GET /auth/google/callback` - Google OAuth callback
-   `POST /auth/invite` - Invite user to house

### Houses

-   `POST /houses` - Create new house
-   `GET /houses/my-houses` - Get user's houses
-   `GET /houses/:id` - Get house details
-   `POST /houses/:id/accept` - Accept house invitation

### Expenses

-   `POST /expenses` - Create new expense
-   `GET /expenses/house/:houseId` - Get house expenses
-   `PUT /expenses/:id` - Update expense
-   `POST /expenses/house/:houseId/settle` - Settle house expenses

## Security

-   All routes except authentication are protected with JWT
-   Google OAuth for secure authentication
-   Email verification for house invitations
-   Role-based access control for house operations
