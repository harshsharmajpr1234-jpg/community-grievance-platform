# JSNM Mobile (Expo / React Native)

Android-first companion app that uses **the same REST API** as the website (see `docs/API.md`).

```bash
cd apps/mobile
npm install
# point the app at your API (Android emulator uses 10.0.2.2 for localhost)
#   edit app.json → expo.extra.apiUrl
npx expo start --android
```

Screens: Splash, Onboarding, Login, Register, Home, Submit Complaint, My Complaints, Complaint Details,
Track Complaint, Notices, Development Works, Government Services, Community, Notifications, Profile,
Settings (language हिन्दी | English), Help. Bottom navigation: Home · Complaints · Notices · Community · Profile.

Auth: password-based registration/login (`POST /api/auth/register`, `POST /api/auth/login`) returns a JWT
which is stored in `expo-secure-store` and sent as `Authorization: Bearer <token>`. Password reset is
email-based via the website (`/forgot-password`).
Uploads use `multipart/form-data` to `POST /api/complaints/:id/documents`.
