import { NextResponse } from "next/server";
import { chromium, type Page } from "playwright";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOUNDON_LIBRARY_URL = "https://www.soundon.global/library/list";
const SOUNDON_SUBMITTED_LIBRARY_URL = "https://www.soundon.global/library/list?type=submitted";
const SOUNDON_LOGIN_URL = "https://www.soundon.global/login?lang=en&region=ID";
const SOUNDON_SESSION_DIR = path.join(process.cwd(), ".soundon-session");
const SOUNDON_STORAGE_STATE_PATH = path.join(SOUNDON_SESSION_DIR, "storage-state.json");

type SoundOnConfig = {
  userId?: string;
  password?: string;
};

async function getSoundOnConfig(): Promise<SoundOnConfig> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT setting_value FROM settings WHERE setting_key = 'soundon_config' LIMIT 1"
  );

  if (!rows[0]?.setting_value) return {};

  try {
    return JSON.parse(rows[0].setting_value);
  } catch {
    return {};
  }
}

function isPlaywrightBrowserMissing(error: any) {
  const message = String(error?.message || "");
  return (
    message.includes("Executable doesn't exist") ||
    message.includes("playwright install") ||
    message.includes("browserType.launch")
  );
}

async function saveStorageState(page: Page) {
  await mkdir(SOUNDON_SESSION_DIR, { recursive: true });
  await page.context().storageState({ path: SOUNDON_STORAGE_STATE_PATH });
}

async function getSavedStorageStatePath() {
  try {
    await readFile(SOUNDON_STORAGE_STATE_PATH, "utf8");
    return SOUNDON_STORAGE_STATE_PATH;
  } catch {
    return undefined;
  }
}

function isExpectedSoundOnNavigationInterrupt(page: Page, message: string) {
  const currentUrl = page.url();
  return (
    message.includes("ERR_ABORTED") ||
    message.includes("interrupted by another navigation") ||
    message.includes("is interrupted by another navigation") ||
    message.includes("soundon.global/login") ||
    currentUrl.includes("soundon.global/login")
  );
}

async function safeGoto(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!isExpectedSoundOnNavigationInterrupt(page, message)) {
      throw error;
    }
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
}

async function fillFirst(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function clickFirst(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function isSoundOnLoggedIn(page: Page) {
  if (page.url().includes("soundon.global/login")) return false;
  const passwordVisible = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  const hasReleasePageText = await page.getByText("My Releases", { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
  return !passwordVisible && (page.url().includes("/library/") || hasReleasePageText);
}

async function isSoundOnLoginPage(page: Page) {
  const passwordVisible = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  return page.url().includes("soundon.global/login") || passwordVisible;
}

async function testSoundOnLogin(page: Page, config: Required<SoundOnConfig>) {
  await safeGoto(page, SOUNDON_SUBMITTED_LIBRARY_URL);
  await page.waitForTimeout(1500);

  if (await isSoundOnLoggedIn(page)) {
    await saveStorageState(page);
    return "Login SoundOn sudah sukses. Silakan lakukan pengecekan release.";
  }

  if (!(await isSoundOnLoginPage(page))) {
    await safeGoto(page, SOUNDON_LOGIN_URL);
    await page.waitForTimeout(1000);
  }

  const userFilled = await fillFirst(
    page,
    [
      "input[name='email']",
      "input[type='email']",
      "input[name='username']",
      "input[name='account']",
      "input[id*='email' i]",
      "input[id*='user' i]",
      "input[placeholder*='email' i]",
      "input[placeholder*='user' i]",
      "input:not([type='password'])",
    ],
    config.userId
  );
  const passwordFilled = await fillFirst(page, ["input[type='password']", "input[name='password']"], config.password);

  if (!userFilled || !passwordFilled) {
    if (await isSoundOnLoggedIn(page)) {
      await saveStorageState(page);
      return "Login SoundOn sudah sukses. Silakan lakukan pengecekan release.";
    }

    throw new Error("Form login SoundOn tidak ditemukan");
  }

  const clicked = await clickFirst(page, [
    "button[type='submit']",
    "button:has-text('Log in')",
    "button:has-text('Login')",
    "button:has-text('Sign in')",
    "button:has-text('Masuk')",
  ]);

  if (!clicked) {
    await page.keyboard.press("Enter");
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await safeGoto(page, SOUNDON_SUBMITTED_LIBRARY_URL);
  await page.waitForTimeout(1500);

  if (!(await isSoundOnLoggedIn(page))) {
    throw new Error("Login SoundOn gagal. Periksa User ID dan Password.");
  }

  await saveStorageState(page);
  return "Tes login SoundOn berhasil. Cookie session sudah disimpan.";
}

export async function POST() {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);
    const config = await getSoundOnConfig();

    if (!config.userId || !config.password) {
      return NextResponse.json(
        { error: "User ID dan Password SoundOn belum tersimpan di database" },
        { status: 400 }
      );
    }

    browser = await chromium.launch({ headless: true });
    const storageState = await getSavedStorageStatePath();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      storageState,
    });
    await context.route("**/*", async (route) => {
      const resourceType = route.request().resourceType();
      if (["image", "media", "font"].includes(resourceType)) {
        await route.abort();
        return;
      }

      await route.continue();
    });
    const page = await context.newPage();

    const message = await testSoundOnLogin(page, { userId: config.userId, password: config.password });

    return NextResponse.json({
      message,
      userId: config.userId,
      sessionSaved: true,
    });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/soundon/test:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (isPlaywrightBrowserMissing(error)) {
      return NextResponse.json(
        { error: "Browser Playwright belum terpasang di server. Jalankan perintah: npm run playwright:install lalu restart Node.js app." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message || "Tes login SoundOn gagal" }, { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
