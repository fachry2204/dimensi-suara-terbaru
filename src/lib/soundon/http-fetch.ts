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
    try {
      const parsed = JSON.parse(trimmed);
      await writeFile(SOUNDON_STORAGE_STATE_PATH, JSON.stringify(parsed, null, 2), "utf8");
      return { success: true, message: "Storage State JSON berhasil disimpan." };
    } catch {
      throw new Error("Format JSON Storage State tidak valid.");
    }
  }

  if (trimmed.includes("=")) {
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
      message: "Cookie session SoundOn belum tersimpan. Silakan simpan Cookie Session di Setting SoundOn.",
    };
  }

  try {
    const res = await fetch("https://www.soundon.global/api/user?withPhone=false", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        Accept: "application/json, text/plain, */*",
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Cookie session SoundOn telah kadaluarsa (Expired). Silakan login di SoundOn lalu perbarui Cookie Session di Setting.",
      };
    }

    const res2 = await fetch("https://www.soundon.global/library/list?type=submitted", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
      },
      redirect: "manual",
    });

    if (res2.status === 301 || res2.status === 302 || res2.headers.get("location")?.includes("/login")) {
      return {
        success: false,
        message: "Cookie session SoundOn telah kadaluarsa (redirect ke login). Silakan update Cookie Session.",
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

function normalizeTitle(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export async function checkReleaseHttpFetch(title: string, upc?: string) {
  const cookieHeader = await getSavedCookieHeader();
  if (!cookieHeader) {
    throw new Error("SOUNDON_LOGIN_REQUIRED");
  }

  // 1. Check if user session is valid first
  try {
    const userRes = await fetch("https://www.soundon.global/api/user?withPhone=false", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        Accept: "application/json, text/plain, */*",
      },
    });

    if (userRes.status === 401 || userRes.status === 403) {
      throw new Error("SOUNDON_LOGIN_REQUIRED");
    }
  } catch (e: any) {
    if (e.message === "SOUNDON_LOGIN_REQUIRED") throw e;
  }

  const targetTitleNorm = normalizeTitle(title || "");
  const targetUpcNorm = (upc || "").trim().toLowerCase();

  if (!targetTitleNorm && !targetUpcNorm) {
    return { found: false };
  }

  // 2. Try fetching SoundOn API album endpoints
  const apiUrls = [
    `https://www.soundon.global/api/album/list?page=1&page_size=100`,
    `https://www.soundon.global/api/album/list?type=submitted&page=1&page_size=100`,
    `https://www.soundon.global/api/v1/album/list?page=1&page_size=100`,
    `https://www.soundon.global/api/song/search?keyword=${encodeURIComponent(title || upc || "")}`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Cookie: cookieHeader,
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.soundon.global/library/list?type=submitted",
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("SOUNDON_LOGIN_REQUIRED");
      }

      if (res.status === 200) {
        const json = await res.json().catch(() => null);
        if (json) {
          const items = Array.isArray(json)
            ? json
            : json.data?.list || json.data?.albums || json.data?.items || json.list || [];

          if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
              const itemTitle = String(item.title || item.name || item.album_name || "");
              const itemUpc = String(item.upc || item.upc_code || "");
              const itemIsrc = String(item.isrc || item.isrc_code || "");
              const itemStatus = String(item.status_str || item.status_text || item.status || "Delivered");

              const titleMatch = targetTitleNorm && normalizeTitle(itemTitle).includes(targetTitleNorm);
              const upcMatch = targetUpcNorm && itemUpc.toLowerCase() === targetUpcNorm;

              if (titleMatch || upcMatch) {
                return {
                  found: true,
                  releaseStatus: itemStatus,
                  matchedTitle: itemTitle || title,
                  upc: itemUpc || upc || "",
                  isrc: itemIsrc || "",
                  rowText: `Ditemukan via API SoundOn (${itemStatus})`,
                };
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.message === "SOUNDON_LOGIN_REQUIRED") throw err;
    }
  }

  // 3. Fallback: Fetch HTML pages
  const pageUrls = [
    "https://www.soundon.global/library/list?type=submitted",
    "https://www.soundon.global/library/list",
  ];

  for (const pageUrl of pageUrls) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Cookie: cookieHeader,
        },
        redirect: "manual",
      });

      if (res.status === 301 || res.status === 302 || res.headers.get("location")?.includes("/login")) {
        throw new Error("SOUNDON_LOGIN_REQUIRED");
      }

      const html = await res.text();
      const lowerHtml = html.toLowerCase();

      if (targetTitleNorm && lowerHtml.includes(title.toLowerCase())) {
        return {
          found: true,
          releaseStatus: "Delivered",
          matchedTitle: title,
          upc: upc || "",
          isrc: "",
          rowText: `Ditemukan di Halaman SoundOn Library`,
        };
      }
    } catch (err: any) {
      if (err.message === "SOUNDON_LOGIN_REQUIRED") throw err;
    }
  }

  return { found: false };
}
