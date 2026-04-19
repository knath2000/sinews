# Mobile App

This is the mobile application for AI News, built with Expo and React Native.

## Architecture

- Built with Expo Router for navigation
- Uses Expo's safe storage for session persistence
- Follows the monorepo structure with the main workspace

## Directory Structure

```
src/
├── app/            # Route components (Expo Router)
│   ├── (tabs)/     # Tab navigation group
│   │   ├── _layout.tsx   # Tab layout with bottom navigation
│   │   ├── index.tsx     # Feed screen
│   │   └── settings.tsx  # Settings screen
│   ├── auth.tsx    # Authentication screen
│   └── layout.tsx  # Root layout
├── lib/            # Utility libraries (Supabase, API clients)
└── components/     # Reusable UI components (placeholder)
```

## Development

To develop the mobile app:

```bash
# Start the development server
npm run dev:mobile

# Run on iOS simulator
npm run ios:mobile

# Run on Android emulator
npm run android:mobile

# Run on web
npm run web:mobile

# Type check the code
npm run typecheck:mobile
```

Note: The mobile app uses Expo-compatible configurations and follows the same conventions as the web app for API endpoints and data structures.