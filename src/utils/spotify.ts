export function getSpotifyArtistUrl(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const isArtistPath = /^\/artist\/[^/?#]+\/?$/i.test(url.pathname);

    if ((url.protocol === "https:" || url.protocol === "http:") && hostname === "open.spotify.com" && isArtistPath) {
      url.protocol = "https:";
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
