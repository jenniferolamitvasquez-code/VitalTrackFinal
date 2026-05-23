import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vitaltrack.app",
  appName: "VitalTrack",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
};

export default config;
