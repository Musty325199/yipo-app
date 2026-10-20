# Yípo Progress Tracker

## Status Overview
- **Current Stage**: Stage 1 (Verification with User on Device)
- **Next Stage**: Stage 2 (Database with expo-sqlite migrations & Group Creation)
- **Command to Run App**:
  - Dev Client: `npx expo start --dev-client`
  - Cloud Dev Build: `npx eas-cli build --profile development --platform android`
  - Local Dev Build: `npx eas-cli build --profile development --platform android --local`

---

## Stages

### [x] Stage 1: Theme, Fonts, Logo, Splash, Navigation Shell
- **Finished**:
  - Expo SDK 58 setup with TypeScript and Expo Router.
  - Design tokens for Light and Dark modes in `src/constants/theme.ts`.
  - Fonts loaded behind splash: Bricolage Grotesque (SemiBold, Bold), Instrument Sans (Regular, Medium, SemiBold).
  - Skia animated splash screen (< 1.2s, 8 dots with saffron dot stepping out, reduced motion support).
  - Procedural asset generation script (`scripts/generate-assets.js`) for 1024x1024 icon, adaptive icon, themed monochrome icon, splash, and notification icon.
  - Responsive layout container (`maxWidth: 640px` on tablets, safe-area insets).
  - Custom stroke-based icon system (Ring, Calendar, Settings, Plus, Lock, Check).
  - Tabs shell (`Groups`, `Calendar`, `Settings`) with live theme switcher and empty state previews.
  - Interactive button with spring scale (0.97) and haptic feedback.
  - `eas.json` configured with `development` (buildType APK), `preview` (APK), and `production` (AAB).
  - `expo-dev-client` installed.
- **Half-Done**:
  - Testing with user on real Samsung device.
- **Known Bugs**: None.

### [ ] Stage 2: Database & Group Creation
- **Next up**:
  - SQLite database setup with versioned migrations (`expo-sqlite`).
  - Money stored as integers (naira), dates stored as ISO.
  - Group creation form with validation (Nigerian phone numbers, non-empty name, amount > 0, no duplicates).
  - Drag-to-reorder and Skia "Draw order" animation with `expo-crypto` and haptic ticks.

### [ ] Stage 3: Round Screen, Ring, Payments, Receipts
### [ ] Stage 4: WhatsApp Reminders, Summary, Receipts, Notifications
### [ ] Stage 5: Swap Turns, Reliability Record, Calendar, History
### [ ] Stage 6: App Lock, Backup, CSV, Settings
### [ ] Stage 7: Polish, Accessibility, Performance Pass, Final APK Build
