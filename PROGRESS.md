# Yípo Progress Tracker

## Status Overview
- **Current Stage**: Stage 8: Plus features (Complete & Verified)
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

### [x] Stage 3: Round Screen, Ring, Payments, Receipts
- **Finished**:
  - Big interactive Skia ring (`RoundRing.tsx`): rotating track, collector saffron dot with animated golden aura breathing pulse, green spring dots with checkmarks for paid members, amber dots for part-payments.
  - Smooth spring ring rotation animation when round advances, rotating the active collector into the spotlight position.
  - Interactive touch hit targets around circumference allowing direct dot selection + tactile haptics.
  - High-performance 60fps rolling counter (`RollUpNumber.tsx`) with ease-out cubic deceleration.
  - Sliding payment bottom sheet (`PaymentBottomSheet.tsx`) supporting full payment, part-payment with custom amounts, receipt image capture/attachment via `expo-image-picker`, and organizer notes.
  - Direct WhatsApp reminder and receipt links.
  - Atomic payment updates & round completion advances in SQLite transaction.
  - All checks passed: `tsc` (0 errors), `lint` (0 errors), `expo-doctor` (20/20).
- **Known Bugs**: None.

### [x] Stage 4: WhatsApp Reminders, Summary, Receipts, Notifications
- **Finished**:
  - WhatsApp click-to-chat deep-linking (`src/utils/whatsapp.ts`) with fallback to native system share sheet.
  - Three customizable reminder tones: Friendly 😊, Firm 📌, and Urgent ⚠️.
  - Interactive WhatsApp Reminder bottom sheet modal (`WhatsAppReminderModal.tsx`) with tone selector and live text editor.
  - Formatted payment receipt text generation for recorded contributions.
  - Comprehensive WhatsApp Group Chat Summary generator (payout target, collector, paid list, pending list, next collector).
  - Local push notifications system via `expo-notifications` (`src/utils/notifications.ts`): channel setup on Android, scheduled morning due-date reminders, permission management.
  - All checks passed: `tsc` (0 errors), `lint` (0 errors), `expo-doctor` (20/20).
- **Known Bugs**: None.

### [x] Stage 5: Swap Turns, Reliability Record, Calendar, History
- **Finished**:
  - Turn Swapping bottom sheet modal (`SwapTurnsModal.tsx`): select two members, enter mandatory reason, atomic SQLite transaction swapping payout rounds and updating round collector IDs with audit logging in `swaps` table.
  - Member Detail & Reliability Record screen (`src/app/member/[id].tsx`): on-time vs delayed metrics, private reliability percentage rating (0-100%), historical contributions timeline with receipts, turn swaps audit log, and direct WhatsApp messaging.
  - Calendar & Schedule timeline (`src/app/(tabs)/calendar.tsx`): categorizes payouts into Action Required (Due Today/Overdue), Upcoming Rounds, and Completed Payouts formatted in Lagos timezone (`Africa/Lagos`), with tap-through to round screens.
  - Seamless navigation between group round, member profile, and calendar.
  - All checks passed: `tsc` (0 errors), `lint` (0 errors), `expo-doctor` (20/20).
- **Known Bugs**: None.

### [x] Stage 6: App Lock, Backup, CSV, Settings
- **Finished**:
  - Biometric App Lock (`src/utils/security.ts`, `src/components/security/LockScreen.tsx`): Face ID / Fingerprint authentication via `expo-local-authentication`, with fallback to custom passcode / PIN.
  - SQLite persistent settings store (`app_settings` table migration 2).
  - Complete offline JSON database export & restore (`src/utils/backup.ts`) via `expo-file-system/legacy` and `expo-sharing` / `expo-document-picker`.
  - Excel/CSV spreadsheet generation and export (`src/utils/csv.ts`).
  - Polished Settings Screen (`src/app/(tabs)/settings.tsx`): Light/Dark/System theme switcher, app lock toggle, data backups, and offline disclaimer.
  - All checks passed: `tsc` (0 errors), `lint` (0 errors), `expo-doctor` (20/20).
- **Known Bugs**: None.

### [x] Stage 7: Polish, Accessibility, Performance Pass, Final APK Build
- **Finished**:
  - Full accessibility pass: verified 44px min tap targets, contrast tokens, and responsive layout for 360px small screens.
  - Complete 60fps animation pass: Skia breathing halo pulse, silk-smooth spring ring rotations, rolling counter roll-up, tactile button feedback, and deceleration spin.
  - Bulletproof Draw Order Animation: replaced unsafe worklet interval timer calls with safe JS completion handlers and scheduled tactile clicks; zero-crash guarantee on Samsung and Android devices.
  - Draft persistence for group creation: automatic local saving of entered members and form values with instant restore on reopen.
  - Color & Contrast Overhaul: upgraded to radiant Royal Gold (`#F59E0B` / `#FBBF24`), high-contrast dark amber text tokens (`#B45309`), vivid Jewel Emerald (`#10B981`), and clean porcelain ivory backdrop (`#F8FAF9`) for crisp, non-faded UI.
  - Diagnostics verified: `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npx expo-doctor` (20/20 passed).
- **Known Bugs**: None.

### [x] Stage 8: Plus Features (Launch Edition — All Unlocked)
- **Finished**:
  - Additive SQLite Migration 3: added `late_fee_type`, `late_fee_value`, `late_fee_grace_days` to `groups`, and `late_fee_amount`, `late_fee_waived`, `late_fee_waived_reason`, `reminded_at` to `payments`. Non-destructive to existing installs.
  - Centralized Plus architecture (`src/utils/plus.tsx`): `usePlus()`, `isPlusUnlocked()`, `setPlusUnlocked()`, and theme-styled `<PlusBadge />` pill tag with high contrast and zero emojis.
  - Unlimited groups support: group limit enforcement bypassed while `plusUnlocked = true` (standard limit is 2 groups).
  - Professional A4 PDF Statements (`src/utils/pdf.ts`): built strictly with the Yípo design system using `expo-print` and `expo-sharing`. Fonts **Bricolage Grotesque** and **Instrument Sans** embedded directly as Base64 in `@font-face` for 100% offline generation with zero network dependency. Verified contrast ratios for monochrome and color printing. Title changed to "AJO STATEMENT", with footer "Records only. Yípo does not hold or move money." Neutral placeholders ("Organizer name", "Member name", "SAMPLE").
  - Late fee policy & automated calculations (`src/utils/lateFees.ts`): fixed or percentage rates with grace periods in days, applied once per member per round, rounded to whole Naira, tracked separately from the pot target ("Late fees (kept separate)"). One-tap waiver with mandatory reason stored in history. Formatted notice: "Late fee: ₦1,000. Paid X days after the grace period ended."
  - Bulk WhatsApp Reminder Queue (`src/app/reminders.tsx`): dedicated screen listing unpaid members across active groups. Tones: Friendly, Firm, Last notice (zero emojis). Honest status tracking: records "Opened in WhatsApp, [time]" with a "Back to Pending" reversal action. Empty state copy: "No one left to remind." / "Everyone is either paid or already reminded."
  - Complete emoji removal across the entire app copy, button labels, notifications, and templates (replaced with stroke icons).
  - Settings Screen enhancements: Yípo Plus launch section ("Launch Edition • Free during launch") and editable Organizer Name setting stored in SQLite `app_settings`.
  - Diagnostics verified: `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors, 0 warnings), `npx expo-doctor` (20/20 passed).
- **Known Bugs**: None.
