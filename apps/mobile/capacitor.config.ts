import type { CapacitorConfig } from "@capacitor/cli";

const devServer = process.env.CAP_SERVER_URL;

const apiBase = process.env.VITE_QUEST_API_BASE;

const updateBase = (apiBase ?? "https://cmu.quest").replace(/\/$/u, "");

const config: CapacitorConfig = {
  appId: "quest.cmu.application",
  appName: "CMU O-Quest",
  webDir: "build",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  plugins: {
    ...(apiBase ? { Quest: { apiBase } } : {}),
    ...(devServer ? {} : { SplashScreen: { launchAutoHide: false } }),
    CapacitorUpdater: {
      updateUrl: `${updateBase}/api/app/updates`,
      statsUrl: "",
      channelUrl: "",
      autoUpdate: devServer ? "off" : "onLaunch",
      autoSplashscreen: !devServer,
      autoSplashscreenLoader: !devServer,
      appReadyTimeout: 15000,
    },
  },
};

export default config;
