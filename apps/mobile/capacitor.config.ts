import type { CapacitorConfig } from "@capacitor/cli";

// set by `android run --live` / `ios run --live`: the app loads from the vite
// dev server instead of the bundle baked into the app
const devServer = process.env.CAP_SERVER_URL;

// The API base is a build-time Vite variable, so the native layer cannot see
// it. Copy it through so AppDelegate can touch it at launch and trigger the
// local-network permission prompt - iOS never raises that for a WKWebView
// fetch, so without it a LAN backend is unreachable and the UI looks inert.
const apiBase = process.env.VITE_QUEST_API_BASE;

const config: CapacitorConfig = {
  // NB: the `org.scottylabs.quest://` URL scheme is intentionally unchanged -
  // see android strings.xml and ios Info.plist CFBundleURLTypes.
  appId: "app.cmu.quest",
  appName: "CMU O-Quest",
  webDir: "build",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  ...(apiBase ? { plugins: { Quest: { apiBase } } } : {}),
};

export default config;
