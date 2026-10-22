# Yípo Android Signing & Key Management Notes

> [!IMPORTANT]
> **Strict Security Notice**: This document contains only public, non-sensitive architectural information (such as package names and public certificate SHA-256 fingerprints). **Never** record keystore passwords, key alias passwords, private keys, or raw keystore bytes in this file, repository, or version control.

---

## 1. Package Name & Identity

- **Android Application ID / Package Name**: `com.musty.yipo`
- **Rule**: This package name **must never change**. 
  - Android uses the package name as the unique global identifier for the app.
  - Changing the package name creates a completely different application in Android's operating system, which would break in-place updates and make existing app data inaccessible.

---

## 2. Keystore Architecture & EAS Profile Consistency

All builds configured in `eas.json` for package `com.musty.yipo` are signed using the **same production Android Keystore** securely managed in EAS Remote Credentials:

| Profile | Build Type | Purpose | Signing Key Source |
|:---|:---|:---|:---|
| `preview` | Standalone APK (`.apk`) | Direct distribution (GitHub Releases, WhatsApp testing) | EAS Remote Managed Keystore |
| `production` | Android App Bundle (`.aab`) | Google Play Store distribution | EAS Remote Managed Keystore |
| `development` | Dev Client APK (`.apk`) | Local development & rapid iteration | EAS Remote Managed Keystore |

### Verification of Settings
- **`app.json`**: `expo.android.package` is set to `"com.musty.yipo"`.
- **`eas.json`**:
  - `cli.appVersionSource` is set to `"remote"`.
  - `preview.autoIncrement` and `production.autoIncrement` are set to `true`.
  - No profile defines local credentials overrides or custom debug signing configurations.
  - EAS automatically binds the project keystore (`com.musty.yipo`) to all builds.

---

## 3. Certificate Fingerprint Verification

To verify that an APK has been signed with the official EAS production release key, run one of the following public inspection commands on your local machine:

### Option A: Using `apksigner` (from Android SDK Build-Tools)
```bash
apksigner verify --print-certs <path-to-apk-file>.apk
```

### Option B: Using `keytool` (built into Java JDK)
```bash
keytool -printcert -jarfile <path-to-apk-file>.apk
```

### Expected Output
Look for the **Certificate SHA-256 Digest**:
```text
Certificate SHA-256 digest: [RECORDED_FINGERPRINT_UPON_FIRST_INSPECTION]
Owner: CN=..., O=..., C=...
Issuer: CN=..., O=..., C=...
```

*(When comparing the dev build APK and the release preview APK, both must print the exact same SHA-256 digest.)*

---

## 4. Google Play Console Setup (Preserving GitHub Installs)

When uploading Yípo to Google Play Console for the very first time:

1. **Select App Signing Option**:
   - In Google Play Console, go to **Release > Setup > App integrity**.
   - Under **Play App Signing**, choose:
     **"Use existing app signing key"** (or *"Export and upload a key from Java keystore"*).
   - **Do NOT** choose *"Use Google-generated key"*. This choice can only be made on the very first release and cannot be changed later.

2. **Export Using PEPK Tool**:
   - Download the Google Play PEPK tool (`pepk.jar`) provided on the Play Console page.
   - Run the PEPK encryption command in your terminal using the `.jks` keystore downloaded from EAS.
   - Upload the resulting encrypted `.zip` output to Google Play Console.

3. **Verify Fingerprint**:
   - Check the **App signing certificate SHA-256** displayed in Play Console.
   - It will match the SHA-256 fingerprint of your GitHub APKs.
   - Result: Users who installed Yípo from GitHub can update to the Google Play Store version directly without losing any of their data.

---

## 5. Safety Net / Fallback Procedure

If a user ever encounters a signature conflict (for example, if they installed a custom debug build from another source):

1. In the existing app, open **Settings > Back up your records > Export Backup**.
2. Save the `.json` file safely to Google Drive, email, or WhatsApp.
3. Uninstall the previous app.
4. Install the new release from GitHub or Google Play.
5. In the new app, open **Settings > Import Backup** and select the `.json` file. All groups, members, payment histories, and notes are 100% restored.
