import { chromium, type Browser } from "playwright";

export function isPlaywrightBrowserMissing(error: any) {
  const message = String(error?.message || "");
  return (
    message.includes("Executable doesn't exist") ||
    message.includes("playwright install") ||
    message.includes("browserType.launch") ||
    message.includes("Host system is missing dependencies")
  );
}

export async function launchSoundOnBrowser(): Promise<Browser> {
  const remoteEndpoint = process.env.SOUNDON_BROWSER_WS_ENDPOINT?.trim();

  if (remoteEndpoint) {
    if (remoteEndpoint.includes("/json/version") || remoteEndpoint.startsWith("http")) {
      return chromium.connectOverCDP(remoteEndpoint);
    }

    return chromium.connect(remoteEndpoint);
  }

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

export function browserInstallMessage() {
  return process.env.SOUNDON_BROWSER_WS_ENDPOINT
    ? "Remote browser SoundOn tidak dapat dijalankan. Periksa SOUNDON_BROWSER_WS_ENDPOINT."
    : "Chromium tidak dapat dijalankan di Plesk. Gunakan VPS/root untuk install dependency Chromium, atau isi SOUNDON_BROWSER_WS_ENDPOINT dengan remote browser.";
}
