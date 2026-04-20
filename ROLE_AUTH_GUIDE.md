# Role-Based Authentication System

This application uses a role-based authentication system that automatically assigns roles based on user UID.

## Roles

### Admin Role
- **UID**: `aUz5GRXgOER5UljVGEnpO4asQij2`
- **Access**: Full admin dashboard at `/dashboard/admin`
- **Permissions**: Can manage cases, appointments, documents, and audit logs

### Client Role
- **Default**: All new registrations are assigned the client role
- **Access**: Client dashboard at `/dashboard/client`
- **Permissions**: Can create appointments and view their own data

## How It Works

### 1. Registration Flow
- User fills out registration form
- System automatically assigns `role: "client"` to all new users
- Account is created in localStorage and Firestore (if available)
- User is redirected to login page

### 2. Login Flow
- User enters credentials
- System checks if UID matches `ADMIN_UID` constant
  - If **UID === ADMIN_UID** → role is set to `"admin"`
  - Otherwise → role is set to `"client"`
- User profile is loaded with the appropriate role
- User is redirected to their dashboard:
  - Admin → `/dashboard/admin`
  - Client → `/dashboard/client`

### 3. Role Assignment Logic

The role is determined in two places:

#### `lib/firebase-auth.ts`
```typescript
const ADMIN_UID = "aUz5GRXgOER5UljVGEnpO4asQij2"

// During login
const userRole = user.uid === ADMIN_UID ? "admin" : "client"
```

#### `hooks/useAuth.ts`
```typescript
const ADMIN_UID = "aUz5GRXgOER5UljVGEnpO4asQij2"

// When loading user profile
const finalRole = firebaseUser.uid === ADMIN_UID ? "admin" : (profile.role || "client")
```

## Setting Up Admin Account

### Method 1: Using the Setup Script (Recommended)
1. Start your development server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open Developer Tools (F12)
4. Go to the **Console** tab
5. Open `scripts/setup-admin.js` and copy the entire content
6. Paste it into the console and press Enter
7. You can now login with the admin credentials shown

### Method 2: Register Manually
1. Register a new account through the registration form
2. Check browser console for the generated UID
3. If the UID matches `aUz5GRXgOER5UljVGEnpO4asQij2`, it will be admin
4. Otherwise, you need to manually update the code to use your generated UID

### Method 3: Update the Admin UID
If you want to use a different UID as admin:
1. Register your admin account first
2. Check the browser console logs to find the UID
3. Update `ADMIN_UID` constant in:
   - `lib/firebase-auth.ts`
   - `hooks/useAuth.ts`

## Firestore Security Rules

The Firestore rules in your Firebase console should match:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }

    match /cases/{caseId} {
      allow read, write, create: if isAdmin();
    }

    match /appointments/{appointmentId} {
      allow create: if isClient();
      allow read, write, delete: if isAdmin();
    }

    match /documents/{documentId} {
      allow read, write, create: if isAdmin();
    }

    match /auditLogs/{logId} {
      allow read, write, create: if isAdmin();
    }

    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    function isClient() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "client";
    }
  }
}
```

## Testing

### Test Admin Login
1. Set up admin account using the setup script
2. Login with admin credentials
3. You should be redirected to `/dashboard/admin`
4. Check console logs to verify role is "admin"

### Test Client Registration & Login
1. Register a new account
2. Complete registration form
3. Login with the new credentials
4. You should be redirected to `/dashboard/client`
5. Check console logs to verify role is "client"

## Debugging

### Check User Role in Console
Open browser console and run:
```javascript
console.log("Current User:", JSON.parse(localStorage.getItem("currentUser")))
console.log("User Profile:", JSON.parse(localStorage.getItem("userProfile")))
console.log("All Registered Users:", JSON.parse(localStorage.getItem("registeredUsers")))
```

### Console Log Messages
Look for these log messages:
- `[v0] UID-based role determination: admin/client for UID: xxx`
- `[v0] User profile loaded successfully: email with role: admin/client`
- `[v0] Redirecting to: /dashboard/admin or /dashboard/client for role: xxx`

## Production Deployment

When deploying to production with Firebase:
1. Ensure Firebase is properly configured in `lib/firebase.ts`
2. Deploy Firestore security rules to Firebase Console
3. The admin UID will remain the same
4. Firebase Authentication will handle user creation instead of localStorage
5. User roles will be stored in Firestore `/users/{uid}` collection
