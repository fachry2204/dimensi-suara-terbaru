const fs = require('fs');
const path = require('path');

async function test() {
  const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
  if (!fs.existsSync(sessionPath)) return;

  const state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';

  // Get passport_csrf_token from cookies
  const csrfToken = state.cookies.find(c => c.name === 'passport_csrf_token')?.value || '';
  console.log("CSRF Token:", csrfToken);

  const testEndpoints = [
    "https://www.soundon.global/api/album/list?page=1&limit=20",
    "https://www.soundon.global/api/album/list?page=1&page_size=20",
    "https://www.soundon.global/api/album/list?type=submitted",
    "https://www.soundon.global/api/album/list",
    "https://www.soundon.global/api/song/list",
    "https://www.soundon.global/api/song/search?keyword=AMMAKKU",
    "https://www.soundon.global/api/v1/album/list",
    "https://www.soundon.global/api/v2/album/list",
  ];

  for (const url of testEndpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Cookie": cookieHeader,
          "X-Tt-Passport-Csrf-Token": csrfToken,
          "x-csrf-token": csrfToken,
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://www.soundon.global/library/list?type=submitted",
        },
      });

      console.log(`URL: ${url} | Status: ${res.status}`);
      const text = await res.text();
      if (res.status === 200) {
        console.log(`SUCCESS! Response: ${text.substring(0, 300)}`);
      } else {
        console.log(`Body: ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`URL: ${url} | Error: ${e.message}`);
    }
  }
}

test().catch(console.error);
