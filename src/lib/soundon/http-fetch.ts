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
      message: "Cookie session SoundOn belum tersimpan. Silakan Impor Cookie Session di Setting SoundOn.",
    };
  }

  try {
    // Test authentication against SoundOn API
    const res = await fetch("https://www.soundon.global/api/user?withPhone=false", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        Accept: "application/json, text/plain, */*",
      },
    });

    const bodyText = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403 || bodyText.toLowerCase().includes("unauthorized")) {
      return {
        success: false,
        message: "Cookie session SoundOn telah KADALUARSA (Expired). Silakan login di soundon.global lalu Impor Cookie Session terbaru di Setting SoundOn.",
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

function formatSoundOnStatus(status: any): string {
  const s = String(status ?? "").trim();
  if (s === "2" || s.toLowerCase() === "delivered" || s.toLowerCase() === "live") return "Delivered";
  if (s === "1" || s.toLowerCase() === "submitted" || s.toLowerCase() === "in review" || s.toLowerCase() === "under review") return "In Review";
  if (s === "3" || s.toLowerCase() === "not approved" || s.toLowerCase() === "not_approved") return "Not Approved";
  if (s === "4" || s.toLowerCase() === "draft") return "Draft";
  if (s.toLowerCase() === "rejected") return "Not Approved";
  if (s.toLowerCase() === "takedown") return "Takedown";
  return s || "Delivered";
}

function extractIsrcFromItem(item: any): string {
  if (!item || typeof item !== "object") return "";
  if (item.isrc) return String(item.isrc);
  if (item.isrc_code) return String(item.isrc_code);
  if (item.song_isrc) return String(item.song_isrc);
  if (item.isrcCode) return String(item.isrcCode);

  const songList =
    item.song_list ||
    item.songs ||
    item.tracks ||
    item.song_info_list ||
    item.songList ||
    item.trackList ||
    item.track_list ||
    [];

  if (Array.isArray(songList) && songList.length > 0) {
    for (const song of songList) {
      const isrc = song.isrc || song.isrc_code || song.song_isrc || song.isrcCode;
      if (isrc) return String(isrc);
    }
  }
  return "";
}

export async function checkReleaseHttpFetch(title: string, upc?: string) {
  const cookieHeader = await getSavedCookieHeader();
  if (!cookieHeader) {
    throw new Error("SOUNDON_LOGIN_REQUIRED");
  }

  // 1. Verify Session Active via SoundOn API
  try {
    const userRes = await fetch("https://www.soundon.global/api/user?withPhone=false", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        Accept: "application/json, text/plain, */*",
      },
    });

    const userText = await userRes.text().catch(() => "");
    if (userRes.status === 401 || userRes.status === 403 || userText.toLowerCase().includes("unauthorized")) {
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

  // 2. Fetch Album List via POST https://www.soundon.global/api/album/list
  try {
    const res = await fetch("https://www.soundon.global/api/album/list", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.soundon.global/library/list",
      },
      body: JSON.stringify({ offset: 0, count: 100, withSongCount: true }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("SOUNDON_LOGIN_REQUIRED");
    }

    if (res.status === 200) {
      const json = await res.json().catch(() => null);
      if (json) {
        const items = Array.isArray(json)
          ? json
          : json.data?.albumList || json.data?.list || json.data?.albums || json.albumList || json.list || [];

        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            const itemTitle = String(item.title || item.name || item.album_name || "");
            const itemUpc = String(item.upc || item.upc_code || "");
            const itemStatus = formatSoundOnStatus(item.status_str || item.status_text || item.status);

            const titleMatch = targetTitleNorm && normalizeTitle(itemTitle).includes(targetTitleNorm);
            const upcMatch = targetUpcNorm && itemUpc.toLowerCase() === targetUpcNorm;

            if (titleMatch || upcMatch) {
              let itemIsrc = extractIsrcFromItem(item);
              const albumId = item.album_id || item.id || item.albumId;

              // If ISRC is not in album list item, try fetching Album Detail
              if (!itemIsrc && albumId) {
                try {
                  const detailUrl = `https://www.soundon.global/api/album/detail?albumId=${encodeURIComponent(albumId)}&album_id=${encodeURIComponent(albumId)}`;
                  const detailRes = await fetch(detailUrl, {
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                      Cookie: cookieHeader,
                      Accept: "application/json, text/plain, */*",
                      Referer: "https://www.soundon.global/library/list",
                    },
                  });

                  if (detailRes.status === 200) {
                    const detailJson = await detailRes.json().catch(() => null);
                    if (detailJson) {
                      itemIsrc = extractIsrcFromItem(detailJson.data?.albumDetail || detailJson.data || detailJson);
                    }
                  }
                } catch {}
              }

              // Also try fetching Song List / Search Song if ISRC is still missing
              if (!itemIsrc) {
                try {
                  const songRes = await fetch("https://www.soundon.global/api/song/list", {
                    method: "POST",
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                      Cookie: cookieHeader,
                      "Content-Type": "application/json",
                      Accept: "application/json, text/plain, */*",
                    },
                    body: JSON.stringify({ count: 100, offset: 0, withPublishingInfo: true, albumId: albumId || "" }),
                  });

                  if (songRes.status === 200) {
                    const songJson = await songRes.json().catch(() => null);
                    const songs = songJson?.data?.songList || songJson?.songList || songJson?.data?.list || [];
                    if (Array.isArray(songs)) {
                      for (const s of songs) {
                        const sTitle = normalizeTitle(s.title || s.name || "");
                        if (!sTitle || sTitle.includes(targetTitleNorm) || targetTitleNorm.includes(sTitle) || String(s.albumId || s.album_id) === String(albumId)) {
                          const sIsrc = s.isrc || s.isrc_code || s.isrcCode;
                          if (sIsrc) {
                            itemIsrc = String(sIsrc);
                            break;
                          }
                        }
                      }
                    }
                  }
                } catch {}
              }

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

  // 3. Fallback: Check HTML page
  try {
    const res = await fetch("https://www.soundon.global/library/list?type=submitted", {
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
    if (html.includes("soundon.global/login") || html.includes('type="password"')) {
      throw new Error("SOUNDON_LOGIN_REQUIRED");
    }

    if (targetTitleNorm && html.toLowerCase().includes(title.toLowerCase())) {
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

  return { found: false };
}
