# Fiducia Mobile App

Multi-tenant digital banking mobile app built with Flutter. Companion to the Fiducia web platform.

## Prerequisites

| Tool           | Version      |
| -------------- | ------------ |
| Flutter SDK    | >= 3.16.0    |
| Dart SDK       | >= 3.2.0     |
| Xcode          | 15+ (iOS)    |
| Android Studio | Hedgehog+ (Android) |
| CocoaPods      | Latest (iOS) |

## Getting Started

```bash
cd mobile

# Install dependencies
flutter pub get

# Generate Riverpod code (providers, routes)
dart run build_runner build --delete-conflicting-outputs

# Run on a connected device or simulator
flutter run
```

### Environment Configuration

Create `lib/config/env.dart` (or use `--dart-define`) to provide your Supabase credentials:

```bash
flutter run \
  --dart-define=SUPABASE_URL=http://localhost:54321 \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

When running against the local Docker Compose stack, use the Supabase URL from `docker-compose.yml` (default `http://localhost:54321`).

## Project Structure

```
lib/
├── config/        # Environment and app configuration
├── models/        # Data models
├── providers/     # Riverpod state providers
├── screens/       # Screen widgets (pages)
├── services/      # API and backend service layer
├── widgets/       # Reusable UI components
└── main.dart      # App entry point
```

## Key Dependencies

| Package                | Purpose                          |
| ---------------------- | -------------------------------- |
| `supabase_flutter`     | Supabase auth and data client    |
| `flutter_riverpod`     | State management                 |
| `go_router`            | Declarative routing              |
| `dio`                  | HTTP client                      |
| `local_auth`           | Biometric authentication         |
| `firebase_messaging`   | Push notifications               |
| `google_maps_flutter`  | Branch / ATM locator maps        |
| `flutter_secure_storage` | Secure credential storage      |
| `geolocator`           | Device location services         |

See `pubspec.yaml` for the full dependency list.

## Running Tests

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage
```

## Building for Release

### Android

```bash
flutter build apk --release
# or for an app bundle:
flutter build appbundle --release
```

The output APK is at `build/app/outputs/flutter-apk/app-release.apk`.

### iOS

```bash
flutter build ipa --release
```

Open `build/ios/archive/Runner.xcarchive` in Xcode to distribute via App Store Connect or TestFlight.

## Push Notifications

The app supports three push notification providers:

- **Firebase Cloud Messaging** (`firebase_messaging`) — default
- **Braze** (`braze_plugin`) — enterprise messaging
- **Airship** (`airship_flutter`) — enterprise messaging

Configure your preferred provider's credentials in the native project files (`android/app/google-services.json`, `ios/Runner/GoogleService-Info.plist`, etc.).

## Connecting to the Backend

The mobile app connects to the same Supabase backend as the web app. For local development:

1. Start the full stack: `docker compose up` (from the repo root)
2. Pass the local Supabase URL and anon key via `--dart-define` flags
3. The app uses the same RPC gateway at `/functions/v1/gateway`
