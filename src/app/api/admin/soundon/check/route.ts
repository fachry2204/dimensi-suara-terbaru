import { NextResponse } from "next/server";
import type { Browser, Page } from "playwright";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";
import { browserInstallMessage, isPlaywrightBrowserMissing, launchSoundOnBrowser } from "@/lib/soundon/browser";
import { checkReleaseHttpFetch } from "@/lib/soundon/http-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOUNDON_LIBRARY_URL = "https://www.soundon.global/library/list";
const SOUNDON_SUBMITTED_LIBRARY_URL = "https://www.soundon.global/library/list?type=submitted";
const SOUNDON_LOGIN_URL = "https://www.soundon.global/login?lang=en&region=ID";
const SOUNDON_SESSION_DIR = path.join(process.cwd(), ".soundon-session");
const SOUNDON_STORAGE_STATE_PATH = path.join(SOUNDON_SESSION_DIR, "storage-state.json");
const GOTO_TIMEOUT_MS = 45000;

type SoundOnConfig = {
  userId?: string;
  password?: string;
  wsEndpoint?: string;
};

type ScrapedRelease = {
  found: boolean;
  releaseStatus?: string;
  matchedTitle?: string;
  rowText?: string;
  upc?: string;
  isrc?: string;
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeReleaseTitle(value: string) {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(remix|remastered|version|official|audio|video)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getSavedStorageStatePath() {
  try {
    await readFile(SOUNDON_STORAGE_STATE_PATH, "utf8");
    return SOUNDON_STORAGE_STATE_PATH;
  } catch {
    return undefined;
  }
}

async function saveStorageState(page: Page) {
  await mkdir(SOUNDON_SESSION_DIR, { recursive: true });
  await page.context().storageState({ path: SOUNDON_STORAGE_STATE_PATH });
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!isExpectedSoundOnNavigationInterrupt(page, message)) {
      throw error;
    }
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
}

async function isSoundOnLoggedIn(page: Page) {
  const currentUrl = page.url();
  if (currentUrl.includes("soundon.global/login")) {
    return false;
  }
  const passwordVisible = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  if (passwordVisible) {
    return false;
  }
  if (currentUrl.includes("/library/")) {
    return true;
  }
  const hasReleasePageText = await page.getByText("My Releases", { exact: false }).first().isVisible().catch(() => false);
  return hasReleasePageText;
}

async function isSoundOnLoginPage(page: Page) {
  const currentUrl = page.url();
  const passwordVisible = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  return currentUrl.includes("soundon.global/login") || passwordVisible;
}

async function waitForSoundOnLibraryReady(page: Page) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await isSoundOnLoginPage(page)) {
      throw new Error("SOUNDON_LOGIN_REQUIRED");
    }

    const hasReleaseText = await page.getByText("My Releases", { exact: false }).first().isVisible().catch(() => false);
    const hasSearchControl = await page
      .locator("input:not([type='password']), textarea, [role='searchbox'], [contenteditable='true']")
      .first()
      .isVisible()
      .catch(() => false);

    if (page.url().includes("/library/") && (hasReleaseText || hasSearchControl)) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error("SOUNDON_LIBRARY_NOT_READY");
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

async function loginToSoundOn(page: Page, config: { userId: string; password: string }) {
  const currentUrl = page.url();
  const passwordInputVisible = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  
  if (!passwordInputVisible && currentUrl.includes("/library/")) {
    await saveStorageState(page);
    return;
  }

  if (!passwordInputVisible && !currentUrl.includes("soundon.global/login")) {
    await safeGoto(page, SOUNDON_LOGIN_URL);
  }

  // Wait for login form elements to render
  await page.locator("input[type='password']").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});

  let userFilled = await fillFirst(
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
  let passwordFilled = await fillFirst(page, ["input[type='password']", "input[name='password']"], config.password);

  if (!userFilled || !passwordFilled) {
    // Single retry with a short delay if form was not ready
    await page.waitForTimeout(1000);
    userFilled = await fillFirst(
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
    passwordFilled = await fillFirst(page, ["input[type='password']", "input[name='password']"], config.password);
  }

  if (!userFilled || !passwordFilled) {
    throw new Error("LOGIN_FORM_NOT_FOUND");
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

  // Wait for post-login load
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Navigate to submitted library URL
  await safeGoto(page, SOUNDON_SUBMITTED_LIBRARY_URL);
  await page.waitForTimeout(1500);

  if (!(await isSoundOnLoggedIn(page))) {
    throw new Error("SOUNDON_LOGIN_FAILED");
  }

  await saveStorageState(page);
}

async function openSoundOnReleaseList(page: Page, url: string) {
  await safeGoto(page, url);
  await waitForSoundOnLibraryReady(page);
}

async function fillSoundOnSearch(page: Page, query: string) {
  await waitForSoundOnLibraryReady(page);

  const directSearchSelectors = [
    "input[type='search']",
    "input[placeholder*='search' i]",
    "input[placeholder*='release' i]",
    "input[placeholder*='title' i]",
    "input[placeholder*='judul' i]",
    "input[aria-label*='search' i]",
    "input[aria-label*='release' i]",
    "[role='searchbox']",
    "textarea[placeholder*='search' i]",
    "[contenteditable='true']",
  ];

  for (const selector of directSearchSelectors) {
    const target = page.locator(selector).first();
    if ((await target.count()) > 0 && (await target.isVisible().catch(() => false))) {
      await target.click();
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
      await page.keyboard.press("Backspace");
      await target.fill(query).catch(async () => {
        await target.type(query, { delay: 20 });
      });
      await page.keyboard.press("Enter").catch(() => {});
      await page.waitForTimeout(1500);
      return;
    }
  }

  const inputs = await page
    .locator("input:not([type='password']), textarea, [role='searchbox'], [contenteditable='true']")
    .all();
  let bestIndex = -1;
  let bestScore = -1;

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    if (!(await input.isVisible().catch(() => false))) continue;

    const box = await input.boundingBox().catch(() => null);
    if (!box || box.width < 80 || box.height < 14) continue;

    const meta = await input.evaluate((element) => {
      const inputElement = element as HTMLInputElement;
      return `${inputElement.placeholder || ""} ${inputElement.name || ""} ${inputElement.id || ""} ${inputElement.type || ""} ${inputElement.getAttribute("aria-label") || ""} ${inputElement.getAttribute("role") || ""}`;
    }).catch(() => "");
    const normalizedMeta = normalizeText(meta);
    let score = box.width;
    if (normalizedMeta.includes("search")) score += 1000;
    if (normalizedMeta.includes("release")) score += 250;
    if (box.y > 200) score += 100;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  if (bestIndex < 0) {
    throw new Error("SOUNDON_SEARCH_NOT_FOUND");
  }

  const input = inputs[bestIndex];
  await input.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await input.fill(query).catch(async () => {
    await input.type(query, { delay: 20 });
  });
  await page.keyboard.press("Enter").catch(() => {});
  await page.waitForTimeout(1500);
}

async function readReleaseStatusByTitle(page: Page, title: string): Promise<ScrapedRelease> {
  const baseTitle = normalizeReleaseTitle(title);
  const titleLocator = page.getByText(title, { exact: false }).first();
  await titleLocator.waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
  if (baseTitle && baseTitle !== normalizeText(title)) {
    await page.getByText(baseTitle, { exact: false }).first().waitFor({ state: "visible", timeout: 1500 }).catch(() => {});
  }

  return page.evaluate(
    ({ titleValue }) => {
      const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
      const normalizeReleaseTitle = (value: string) =>
        normalize(value)
          .replace(/\([^)]*\)/g, " ")
          .replace(/\[[^\]]*\]/g, " ")
          .replace(/\b(remix|remastered|version|official|audio|video)\b/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const wantedTitle = normalize(titleValue);
      const wantedBaseTitle = normalizeReleaseTitle(titleValue);
      const titleVariants = Array.from(new Set([wantedTitle, wantedBaseTitle].filter(Boolean)));
      const statusWords = [
        "Delivered",
        "Not Approved",
        "Approved",
        "Submitted",
        "Processing",
        "Pending",
        "Rejected",
        "Live",
        "Take Down",
        "Takedown",
        "Draft",
        "Failed",
        "In Review",
      ];
      const extractUpc = (text: string) => {
        const matches = text.match(/\b\d{12,14}\b/g) || [];
        return matches[0] || "";
      };
      const extractIsrc = (text: string) => {
        const matches = text.match(/\b[A-Z]{2}[A-Z0-9]{3}\d{7}\b/gi) || [];
        return Array.from(new Set(matches.map((match) => match.toUpperCase()))).join(", ");
      };

      const exactTitleElements = Array.from(document.querySelectorAll("body *")).filter((element) => {
        const text = normalize(element.textContent || "");
        const normalizedTitleText = normalizeReleaseTitle(text);
        return titleVariants.some((variant) => {
          if (text === variant || text.includes(variant)) return true;
          return variant.length >= 6 && (normalizedTitleText.includes(variant) || variant.includes(normalizedTitleText));
        });
      });

      const candidates: Array<{ element: Element; score: number }> = [];
      for (const titleElement of exactTitleElements) {
        let current: Element | null = titleElement;
        for (let depth = 0; depth < 10 && current; depth += 1) {
          const text = normalize(current.textContent || "");
          const normalizedTitleText = normalizeReleaseTitle(text);
          if (titleVariants.some((variant) => text.includes(variant) || normalizedTitleText.includes(variant))) {
            let score = 20 - depth;
            if (statusWords.some((status) => text.includes(normalize(status)))) score += 20;
            if (current.matches("tr,[role='row'],li")) score += 10;
            if (text.includes("release status")) score -= 10;
            if (text.length > 1500) score -= 20;
            candidates.push({ element: current, score });
          }
          current = current.parentElement;
        }
      }

      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.element.textContent || "").length - (b.element.textContent || "").length;
      });

      for (const candidate of candidates) {
        const rowText = (candidate.element.textContent || "").replace(/\s+/g, " ").trim();
        const normalizedRow = normalize(rowText);
        const normalizedTitleRow = normalizeReleaseTitle(rowText);
        if (!titleVariants.some((variant) => normalizedRow.includes(variant) || normalizedTitleRow.includes(variant))) continue;
        const releaseStatus = statusWords.find((word) => normalizedRow.includes(normalize(word))) || "";
        if (!releaseStatus) continue;

        return {
          found: true,
          releaseStatus,
          matchedTitle: titleValue,
          upc: extractUpc(rowText),
          isrc: extractIsrc(rowText),
          rowText: rowText.replace(/\s+/g, " ").trim(),
        };
      }

      return { found: false };
    },
    { titleValue: title }
  );
}

function extractIdentifiersFromText(text: string) {
  const upcMatches = text.match(/\b\d{12,14}\b/g) || [];
  const isrcMatches = text.match(/\b[A-Z]{2}[A-Z0-9]{3}\d{7}\b/gi) || [];

  return {
    upc: upcMatches[0] || "",
    isrc: Array.from(new Set(isrcMatches.map((match) => match.toUpperCase()))).join(", "),
  };
}

async function clickSoundOnReleaseDetail(page: Page, title: string) {
  const titleLocator = page.getByText(title, { exact: false }).first();
  if (!(await titleLocator.isVisible({ timeout: 2500 }).catch(() => false))) {
    return false;
  }

  const currentUrl = page.url();
  await titleLocator.click({ timeout: 2500 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);

  return page.url() !== currentUrl || !(await page.getByText("My Releases", { exact: false }).first().isVisible({ timeout: 1000 }).catch(() => false));
}

async function scrapeSoundOnDetailIdentifiers(page: Page) {
  const detailText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  return extractIdentifiersFromText(detailText);
}

async function searchReleaseOnPage(page: Page, title: string): Promise<ScrapedRelease> {
  const query = title.trim();
  if (!query) return { found: false };

  const currentUrl = page.url();
  if (!currentUrl.includes("soundon.global/library/list") || !currentUrl.includes("type=submitted")) {
    await openSoundOnReleaseList(page, SOUNDON_SUBMITTED_LIBRARY_URL);
  }
  await fillSoundOnSearch(page, query).catch((error) => {
    if (error.message !== "SOUNDON_SEARCH_NOT_FOUND") {
      throw error;
    }
  });
  const result = await readReleaseStatusByTitle(page, query);
  if (result.found) {
    const openedDetail = await clickSoundOnReleaseDetail(page, query);
    if (openedDetail) {
      const detailIdentifiers = await scrapeSoundOnDetailIdentifiers(page);
      return {
        ...result,
        upc: detailIdentifiers.upc || result.upc,
        isrc: detailIdentifiers.isrc || result.isrc,
      };
    }

    return result;
  }

  return { found: false };
}

async function saveCheckResultsToDb(title: string, releaseId?: string | number, scraped?: any) {
  if (!scraped || !scraped.found) return;

  try {
    const upcVal = scraped.upc || null;
    const statusVal = scraped.releaseStatus || null;
    const isrcVal = scraped.isrc || null;

    let targetId = releaseId;
    if (!targetId && title) {
      const [rows]: any = await db.query("SELECT id FROM releases WHERE LOWER(title) = LOWER(?) LIMIT 1", [title]);
      if (rows && rows.length > 0) {
        targetId = rows[0].id;
      }
    }

    if (targetId) {
      await db.query(
        "UPDATE releases SET aggregator = COALESCE(NULLIF(aggregator, ''), 'SoundOn'), upc = COALESCE(?, upc), soundon_status = COALESCE(?, soundon_status) WHERE id = ?",
        [upcVal, statusVal, targetId]
      );

      if (isrcVal) {
        await db.query(
          "UPDATE tracks SET isrc = COALESCE(?, isrc) WHERE release_id = ?",
          [isrcVal, targetId]
        );
      }
    }
  } catch (err) {
    console.error("Error saving check results to DB:", err);
  }
}

export async function POST(request: Request) {
  let browser: Browser | null = null;

  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const upc = String(body.upc || "").trim();
    const releaseId = body.id || body.releaseId;

    if (!title && !upc) {
      return NextResponse.json({ error: "Judul rilis atau UPC wajib diisi" }, { status: 400 });
    }

    const config = await getSoundOnConfig();
    if (!config.userId || !config.password) {
      return NextResponse.json({ error: "User ID dan Password SoundOn belum disimpan di Setting" }, { status: 400 });
    }

    try {
      browser = await launchSoundOnBrowser(config.wsEndpoint);
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

      await safeGoto(page, SOUNDON_SUBMITTED_LIBRARY_URL);
      
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes("soundon.global/login") || (await page.locator("input[type='password']").first().isVisible().catch(() => false));
      const isLoggedIn = !isLoginPage && currentUrl.includes("/library/");

      if (!isLoggedIn) {
        await loginToSoundOn(page, { userId: config.userId, password: config.password });
      } else {
        await saveStorageState(page);
      }

      const scraped = await searchReleaseOnPage(page, title);
      await saveCheckResultsToDb(title, releaseId, scraped);

      return NextResponse.json({
        status: scraped.found ? "found" : "not_found",
        message: scraped.found ? "Rilis ditemukan di SoundOn" : "Rilis tidak ditemukan di SoundOn",
        releaseStatus: scraped.releaseStatus || "",
        matchedTitle: scraped.matchedTitle || "",
        upc: scraped.upc || "",
        isrc: scraped.isrc || "",
        rowText: scraped.rowText || "",
      });
    } catch (browserErr: any) {
      if (isPlaywrightBrowserMissing(browserErr)) {
        // Fallback to direct HTTP fetch for Plesk hosting
        try {
          const scraped = await checkReleaseHttpFetch(title, upc);
          await saveCheckResultsToDb(title, releaseId, scraped);

          return NextResponse.json({
            status: scraped.found ? "found" : "not_found",
            message: scraped.found ? "Rilis ditemukan di SoundOn (Direct HTTP)" : "Rilis tidak ditemukan di SoundOn (Direct HTTP)",
            releaseStatus: scraped.releaseStatus || "",
            matchedTitle: scraped.matchedTitle || "",
            upc: scraped.upc || "",
            isrc: scraped.isrc || "",
            rowText: scraped.rowText || "",
          });
        } catch (httpErr: any) {
          if (httpErr.message === "SOUNDON_LOGIN_REQUIRED") {
            return NextResponse.json({ error: "Session SoundOn expired atau belum ada Cookie Session. Silakan simpan Cookie Session di Setting SoundOn." }, { status: 502 });
          }
          return NextResponse.json(
            { error: `${browserInstallMessage(config.wsEndpoint)} ${httpErr.message || ""}` },
            { status: 500 }
          );
        }
      }

      throw browserErr;
    }
  } catch (error: any) {
    console.error("API Error - POST /api/admin/soundon/check:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (error.message === "LOGIN_FORM_NOT_FOUND") return NextResponse.json({ error: "Form login SoundOn tidak ditemukan" }, { status: 502 });
    if (error.message === "SOUNDON_LOGIN_FAILED") return NextResponse.json({ error: "Login SoundOn gagal. Periksa User ID dan Password." }, { status: 502 });
    if (error.message === "SOUNDON_LOGIN_REQUIRED") return NextResponse.json({ error: "Session SoundOn expired. Sistem perlu login ulang." }, { status: 502 });
    if (error.message === "SOUNDON_LIBRARY_NOT_READY") return NextResponse.json({ error: "Halaman rilis SoundOn belum siap dimuat" }, { status: 502 });
    if (error.message === "SOUNDON_SEARCH_NOT_FOUND") return NextResponse.json({ error: "Kolom pencarian SoundOn tidak ditemukan" }, { status: 502 });
    return NextResponse.json({ error: error.message || "Gagal scraping SoundOn" }, { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
