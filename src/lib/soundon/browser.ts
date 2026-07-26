import { chromium, type Browser } from "playwright";

export function isPlaywrightBrowserMissing(error: any) {
  const message = String(error?.message || "");
  return (
    message.includes("Executable doesn't exist") ||
    message.includes("playwright install") ||
    message.includes("browserType.launch") ||
    message.includes("Host system is missing dependencies") ||
    message.includes("ENOENT")
  );
}

export async function launchSoundOnBrowser(customWsEndpoint?: string): Promise<Browser> {
  const remoteEndpoint = customWsEndpoint?.trim() || process.env.SOUNDON_BROWSER_WS_ENDPOINT?.trim();

  if (remoteEndpoint) {
    if (remoteEndpoint.includes("/json/version") || remoteEndpoint.startsWith("http://") || remoteEndpoint.startsWith("https://")) {
      return chromium.connectOverCDP(remoteEndpoint);
    }

    return chromium.connect(remoteEndpoint);
  }

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

export function browserInstallMessage(customWsEndpoint?: string) {
  const remoteEndpoint = customWsEndpoint?.trim() || process.env.SOUNDON_BROWSER_WS_ENDPOINT?.trim();
  return remoteEndpoint
    ? "Remote browser SoundOn tidak dapat dihubungi. Periksa URL Remote Browser WS Endpoint."
    : "Chromium tidak dapat dijalankan di Plesk/Shared hosting. Silakan masukkan Remote Browser WS Endpoint atau Import Cookie Session secara manual.";
}

