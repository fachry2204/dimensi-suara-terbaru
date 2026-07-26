import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const SOUNDON_SESSION_DIR = path.join(process.cwd(), ".soundon-session");
const SOUNDON_STORAGE_STATE_PATH = path.join(SOUNDON_SESSION_DIR, "storage-state.json");
const SOUNDON_RAW_COOKIE_PATH = path.join(SOUNDON_SESSION_DIR, "cookies.txt");

export interface SoundOnCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

export interface SoundOnStorageState {
  cookies: SoundOnCookie[];
  origins?: any[];
}

export async function getSavedCookieHeader(): Promise<string> {
  // 1. Try reading storage-state.json
  try {
    const raw = await readFile(SOUNDON_STORAGE_STATE_PATH, "utf8");
    const parsed: SoundOnStorageState = JSON.parse(raw);
    if (parsed.cookies && Array.isArray(parsed.cookies) && parsed.cookies.length > 0) {
      return parsed.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    }
  } catch {}

  // 2. Try reading raw cookies.txt
  try {
    const raw = await readFile(SOUNDON_RAW_COOKIE_PATH, "utf8");
    if (raw.trim()) {
      return raw.trim();
    }
  } catch {}

  return "";
}

export async function saveCookieSession(cookieOrJsonInput: string) {
  await mkdir(SOUNDON_SESSION_DIR, { recursive: true });
  const trimmed = cookieOrJsonInput.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    // Looks like storage-state.json
    try {
      const parsed = JSON.parse(trimmed);
      await writeFile(SOUNDON_STORAGE_STATE_PATH, JSON.stringify(parsed, null, 2), "utf8");
      return { success: true, message: "Storage State JSON berhasil disimpan." };
    } catch {
      throw new Error("Format JSON Storage State tidak valid.");
    }
  }

  // Treat as raw Cookie header string
  if (trimmed.includes("=")) {
    // Create a minimal storage-state.json compatible format
    const cookiePairs = trimmed.split(";").map((pair) => pair.trim()).filter(Boolean);
    const cookies: SoundOnCookie[] = cookiePairs.map((pair) => {
      const eqIdx = pair.indexOf("=");
      const name = eqIdx > -1 ? pair.substring(0, eqIdx).trim() : pair;
      const value = eqIdx > -1 ? pair.substring(eqIdx + 1).trim() : "";
      return { name, value, domain: ".soundon.global", path: "/" };
    });

    const storageState: SoundOnStorageState = { cookies, origins: [] };
    await writeFile(SOUNDON_STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), "utf8");
    await writeFile(SOUNDON_RAW_COOKIE_PATH, trimmed, "utf8");
    return { success: true, message: `Berhasil mengimpor ${cookies.length} cookie session SoundOn.` };
  }

  throw new Error("Format Cookie / Session String tidak valid.");
}

export async function testSoundOnHttpFetch(): Promise<{ success: boolean; message: string }> {
  const cookieHeader = await getSavedCookieHeader();
  if (!cookieHeader) {
    return {
      success: false,
      message: "Cookie session SoundOn belum ada. Silakan simpan Cookie Session di Setting.",
    };
  }

  try {
    const res = await fetch("https://www.soundon.global/library/list?type=submitted", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      },
      redirect: "manual",
    });

    const status = res.status;
    const location = res.headers.get("location") || "";

    if (status === 302 || status === 301 || location.includes("/login")) {
      return {
        success: false,
        message: "Cookie session SoundOn telah kadaluarsa (redirect ke login). Silakan update Cookie Session.",
      };
    }

    const htmlText = await res.text();
    if (htmlText.includes("soundon.global/login") || htmlText.includes('type="password"')) {
      return {
        success: false,
        message: "Session SoundOn tidak valid (terdeteksi halaman login). Silakan perbarui Cookie Session.",
      };
    }

    return {
      success: true,
      message: "Tes koneksi SoundOn (HTTP Direct Fetch) BERHASIL! Session Cookie aktif.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `HTTP Fetch Error: ${err.message || "Gagal menghubungi SoundOn"}`,
    };
  }
}

export async function checkReleaseHttpFetch(title: string, upc?: string) {
  const cookieHeader = await getSavedCookieHeader();
  if (!cookieHeader) {
    throw new Error("Cookie session SoundOn belum tersimpan. Silakan perbarui Cookie di Setting SoundOn.");
  }

  const searchTarget = (title || upc || "").toLowerCase().trim();

  // Fetch Submitted Library
  const res = await fetch("https://www.soundon.global/library/list?type=submitted", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Cookie: cookieHeader,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "manual",
  });

  if (res.status === 301 || res.status === 302 || res.headers.get("location")?.includes("/login")) {
    throw new Error("SOUNDON_LOGIN_REQUIRED");
  }

  const html = await res.text();
  const lowerHtml = html.toLowerCase();

  if (lowerHtml.includes(searchTarget)) {
    return {
      found: true,
      releaseStatus: "Submitted / Distribution in Progress",
      matchedTitle: title,
      upc: upc || "",
      isrc: "",
      rowText: `Ditemukan via Direct HTTP Fetch di Halaman SoundOn Library`,
    };
  }

  // Fetch standard library as well
  const res2 = await fetch("https://www.soundon.global/library/list", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Cookie: cookieHeader,
    },
  });

  const html2 = await res2.text();
  if (html2.toLowerCase().includes(searchTarget)) {
    return {
      found: true,
      releaseStatus: "Released / Active",
      matchedTitle: title,
      upc: upc || "",
      isrc: "",
      rowText: `Ditemukan via Direct HTTP Fetch di Halaman SoundOn Library`,
    };
  }

  return { found: false };
}
