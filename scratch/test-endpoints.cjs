const fs = require('fs');
const path = require('path');

async function test() {
  const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
  if (!fs.existsSync(sessionPath)) {
    console.log("No storage state file found!");
    return;
  }

  const raw = fs.readFileSync(sessionPath, 'utf8');
  const state = JSON.parse(raw);
  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';

  const candidateEndpoints = [
    "https://www.soundon.global/api/v1/album/list?page=1&page_size=20&status=submitted",
    "https://www.soundon.global/api/v1/album/list?page=1&page_size=20",
    "https://www.soundon.global/api/v1/release/list?page=1&page_size=20",
    "https://www.soundon.global/api/album/list?page=1&page_size=20",
    "https://www.soundon.global/api/release/list?page=1&page_size=20",
    "https://www.soundon.global/api/v1/album/search?keyword=AMMAKKU",
    "https://www.soundon.global/api/album/search?keyword=AMMAKKU",
    "https://www.soundon.global/api/v1/release/search?keyword=AMMAKKU",
    "https://www.soundon.global/api/v1/library/list",
    "https://www.soundon.global/api/library/list",
  ];

  for (const url of candidateEndpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Cookie": cookieHeader,
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://www.soundon.global/library/list",
        },
      });

      console.log(`\nURL: ${url}`);
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Length: ${text.length}`);
      if (res.status === 200) {
        console.log(`Snippet: ${text.substring(0, 300)}`);
      }
    } catch (err) {
      console.log(`URL: ${url} -> Error: ${err.message}`);
    }
  }
}

test().catch(console.error);
