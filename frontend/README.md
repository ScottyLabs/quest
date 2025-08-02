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

## Android Development

You need a Chromium-based browser in order to debug the application when running in the Android emulator.

1. Start the frontend in the Android emulator:

```bash
bun tauri android dev
```

2. Navigate to [chrome://inspect](chrome://inspect) in the browser. After the streamed install completes, "WebView in org.scottylabs.quest" should show up under the "Remote Target" section.

3. Press "inspect" to connect to the emulated device, and use the browser console as normal.
