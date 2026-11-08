import type { CapacitorConfig } from "@capacitor/cli";

// the Capacitor CLI loads this file in Node
declare const process: { env: Record<string, string | undefined> };

function setting(name: string): string | undefined {
  const value = process.env[name];
  return value === "" ? undefined : value;
}

const devServer = setting("CAP_SERVER_URL");

const apiBase = setting("VITE_QUEST_API_BASE");

const updateBase = (apiBase ?? "https://cmu.quest").replace(/\/$/u, "");

const config: CapacitorConfig = {
  appId: "quest.cmu.application",
  appName: "CMU O-Quest",
  webDir: "build",
  ...(devServer === undefined ? {} : { server: { url: devServer, cleartext: true } }),
  plugins: {
    ...(apiBase === undefined ? {} : { Quest: { apiBase } }),
    ...(devServer === undefined ? { SplashScreen: { launchAutoHide: false } } : {}),
    CapacitorUpdater: {
      updateUrl: `${updateBase}/api/app/updates`,
      statsUrl: "",
      channelUrl: "",
      autoUpdate: devServer === undefined ? "onLaunch" : "off",
      autoSplashscreen: devServer === undefined,
      autoSplashscreenLoader: devServer === undefined,
      appReadyTimeout: 15000,
    },
  },
};

export default config;
