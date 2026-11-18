# Engram Decks Mobile

Mobile client for flashcard decks. Built with React Native, Expo, and TypeScript. It talks to the Engram Decks Spring Boot API.

## Requirements

- Node.js LTS
- The API listening on port 8080 when you want live data

## Run

```bat
npm install
npx expo start
```

On a phone, `localhost` is the phone. The app uses the Expo packager host on port 8080. Set `EXPO_PUBLIC_API_BASE_URL` to override that (Android emulator: `http://10.0.2.2:8080`).

## Directory structure

```text
engram-decks-mobile/
├── src/
│   ├── app/          # File-based routes (Expo Router)
│   ├── components/   # Reusable UI
│   ├── services/     # HTTP calls to the API
│   ├── types/        # TypeScript types aligned with the API DTOs
│   └── constants/    # API base URL and theme
├── assets/           # Icons and splash
├── app.json
└── package.json
```

Screens call functions in `src/services/`. They do not call `fetch` directly.
