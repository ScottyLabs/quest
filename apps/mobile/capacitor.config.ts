import type { CapacitorConfig } from "@capacitor/cli";

const devServer = process.env.CAP_SERVER_URL;

const apiBase = process.env.VITE_QUEST_API_BASE;

const config: CapacitorConfig = {
  appId: "quest.cmu.app",
  appName: "CMU O-Quest",
  webDir: "build",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  ...(apiBase ? { plugins: { Quest: { apiBase } } } : {}),
};

export default config;
