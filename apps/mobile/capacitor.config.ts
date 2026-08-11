import type { CapacitorConfig } from "@capacitor/cli";

const devServer = process.env.CAP_SERVER_URL;

const apiBase = process.env.VITE_QUEST_API_BASE;

const updateBase = (apiBase ?? "https://cmu.quest").replace(/\/$/u, "");

const config: CapacitorConfig = {
  appId: "quest.cmu.app",
  appName: "CMU O-Quest",
  webDir: "build",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  plugins: {
    ...(apiBase ? { Quest: { apiBase } } : {}),
    CapacitorUpdater: {
      updateUrl: `${updateBase}/api/app/updates`,
      statsUrl: "",
      channelUrl: "",
      autoUpdate: !devServer,
      appReadyTimeout: 15000,
    },
  },
};

export default config;
