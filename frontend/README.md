# O-Quest Frontend

## API Client

Each of the following instructions assume you are in this directory.

1. When developing `frontend` locally, ensure that you have also started `backend`:

```bash
# in a new terminal window
cd ../backend
cargo run
```

2. If you make any update `backend` in any way that changes the OpenAPI spec, make sure to re-generate the schema in `frontend` with:

```bash
# this requires the backend to be running
bun run generate-types
```

3. Start the frontend:

```bash
bun run dev
```

## Android Signing

The steps available [here](https://v2.tauri.app/distribute/sign/android/) were used to generate the signing key.

1. Find the "Android Signing Key" note on `vault.scottylabs.org`, and copy its password entry.

2. Download the attached `upload-keystore.jks` file to somewhere convenient, like `/Users/<you>/upload-keystore.jks` on Mac. Keep note of the absolute path.

3. Create the file `./src-tauri/gen/android/keystore.properties`:

```properties
password=<password from the note>
keyAlias=upload
storeFile=<absolute path to the key store file>
```

4. Build the app:

```bash
bun tauri android build
```

## Apple Development

You first need to find the Apple development Team ID from Apple Developer.

It must be set in:

1. The value of `bundle -> iOS -> developmentTeam` in the `tauri.conf.json` file

2. The value `$TEAM_ID.org.scottylabs.quest` for `applinks -> details -> 0 -> appIDs -> 0` in the `.well-known/apple-app-site-association` file

If you are running a beta version of macOS, Tauri may be unable to find `Xcode-beta`. You need to point it to the correct application:

```bash
sudo xcode-select -s /Applications/Xcode-beta.app/Contents/Developer
```

You can verify it is working by listing the available simulators:

```bash
xcrun simctl list devices available
```

Use the following command to start development:

```bash
bun tauri ios dev --host # if testing on a physical device
bun tauri ios dev # otherwise
```

## Android Development

You need a Chromium-based browser in order to debug the application when running in the Android emulator.

1. Start the frontend in the Android emulator:

```bash
bun tauri android dev
```

2. Navigate to [chrome://inspect](chrome://inspect) in the browser. After the streamed install completes, "WebView in org.scottylabs.quest" should show up under the "Remote Target" section.

3. Press "inspect" to connect to the emulated device, and use the browser console as normal.

## Android Deep Links

The following instructions assume you are developing on Mac.

In order to register deep links when testing in dev, you need the `.well-known/assetlinks.json` file to include the `sha256_cert_fingerprints` that your debug keystore is using. You can get this value by running:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

The value is on the line that begins with `SHA256`. Then, verify that it is the one your debug APK is actually using by running:

```bash
$(find ~/Library/Android/sdk/build-tools -name "apksigner" | head -1) verify --print-certs --verbose src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```

The value is on the line that begins with `Signer #1 certificate SHA-256 digest` (NOT the line that begins with `Signer #1 public key SHA-256 digest`, or either option with `SHA-1` instead of `SHA-256`).

The SHA-256 fingerprints from both commands should match (the first will have colons, the second won't). Add the fingerprint with colons to the `assetlinks.json` file alongside the existing certificate fingerprints.
