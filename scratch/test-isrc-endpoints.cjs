const fs = require('fs');
const path = require('path');

async function test() {
  const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
  if (!fs.existsSync(sessionPath)) return;

  const state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';

  console.log("1. Testing POST https://www.soundon.global/api/song/list ...");
  try {
    const res = await fetch("https://www.soundon.global/api/song/list", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Cookie": cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count: 100, offset: 0, withPublishingInfo: true }),
    });
    console.log("SongList status:", res.status);
    const text = await res.text();
    console.log("SongList snippet:", text.substring(0, 500));
  } catch (e) {
    console.log("SongList error:", e.message);
  }

  console.log("\n2. Testing POST https://www.soundon.global/api/album/list ...");
  try {
    const res = await fetch("https://www.soundon.global/api/album/list", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Cookie": cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count: 100, offset: 0, withSongCount: true }),
    });
    console.log("AlbumList status:", res.status);
    const text = await res.text();
    console.log("AlbumList snippet:", text.substring(0, 500));
  } catch (e) {
    console.log("AlbumList error:", e.message);
  }
}

test().catch(console.error);
