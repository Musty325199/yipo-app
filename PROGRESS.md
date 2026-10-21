# Yípo Progress Tracker

## Status Overview
- **Current Stage**: Stage 3 (Round Screen, Skia Ring, Payments & Receipts)
- **Command to Run App**:
  - Preview APK Build: `npx eas-cli build --profile preview --platform android`
  - Dev Client: `npx expo start --dev-client`

---

## Stages

### [x] Stage 1: Theme, Fonts, Logo, Splash, Navigation Shell
- **Finished**:
  - Design tokens for Light and Dark modes.
  - Bricolage Grotesque & Instrument Sans fonts loaded behind splash.
  - Skia animated splash screen (staggered clockwise circle ignition, wheel deceleration spin, saffron step-out with golden pulse halo).
  - Navigation tab shell (`Groups`, `Calendar`, `Settings`).
  - Button press feedback (0.97 scale spring + haptics).
  - Verified on physical Samsung phone.
- **Known Bugs**: None.

### [x] Stage 2: Database & Group Creation
- **Finished**:
  - SQLite database with versioned migrations system (`expo-sqlite`).
  - Money stored as whole integers (naira), dates stored as ISO in `Africa/Lagos` timezone.
  - Nigerian phone normalization & validation (`234XXXXXXXXXX`).
  - Multi-step group creation flow (`src/app/group/new.tsx`).
  - Cryptographically random Draw Order ring with Skia spinning animation, decelerating ease, and haptic ticks (`src/components/ring/DrawOrderModal.tsx`).
  - Active groups live summary on Groups Home screen (`src/app/(tabs)/index.tsx`).
  - All checks passed: `tsc` (0 errors), `lint` (0 errors), `expo-doctor` (20/20).
- **Known Bugs**: None.

### [ ] Stage 3: Round Screen, Ring, Payments, Receipts
- **In Progress**:
  - Big Skia rotating ring with collector saffron dot & animated dot fills.
  - Bottom sheet for member payment (mark paid, part payment, receipt photo, note).
  - Green spring fill animation on paid dot + light haptic.
  - Number roll-up / count-up animation for "₦X of ₦Y collected".
  - Collector receipt confirmation ("I have received my money") with round close & smooth ring rotation to the next collector.

### [ ] Stage 4: WhatsApp Reminders, Summary, Receipts, Notifications
### [ ] Stage 5: Swap Turns, Reliability Record, Calendar, History
### [ ] Stage 6: App Lock, Backup, CSV, Settings
### [ ] Stage 7: Polish, Accessibility, Performance Pass, Final APK Build
