import Constants from "expo-constants";

const cloudFallbackURL = "https://avinyahrms.duckdns.org";
const BACKEND_PORT = 8080;

// In dev, the phone/emulator already connects to the Metro bundler at this
// host to load the JS bundle — reusing that IP means the API/socket URL is
// always correct for whichever Wi-Fi network (home, office, ...) you're
// currently on, with no manual .env edits when you switch networks.
function getDevServerIP(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  return hostUri ? hostUri.split(":")[0] : null;
}

// Explicit override always wins (e.g. Android emulator needs 10.0.2.2,
// or you want to point a dev build at the hosted backend).
const envOverrideURL =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL;

const devServerIP = __DEV__ ? getDevServerIP() : null;

export const apiBaseURL =
  envOverrideURL || (devServerIP ? `http://${devServerIP}:${BACKEND_PORT}` : cloudFallbackURL);

export const socketURL = apiBaseURL;
