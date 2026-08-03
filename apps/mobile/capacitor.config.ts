import type { CapacitorConfig } from "@capacitor/cli";

// set by `android run --live` / `ios run --live`: the app loads from the vite
// dev server instead of the bundle baked into the app
const devServer = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "org.scottylabs.quest",
  appName: "CMU Quest",
  webDir: "build",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
};

export default config;
