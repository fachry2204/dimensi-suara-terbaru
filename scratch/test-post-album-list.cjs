const fs = require('fs');
const path = require('path');

async function test() {
  const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
  if (!fs.existsSync(sessionPath)) return;

  const state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';
  const csrfToken = state.cookies.find(c => c.name === 'passport_csrf_token')?.value || '';

  console.log("Testing POST https://www.soundon.global/api/album/list ...");

  const requestBodies = [
    { offset: 0, count: 100, withSongCount: true },
    { offset: 0, count: 100, status: 1 },
    { offset: 0, count: 100, status: 2 },
    { offset: 0, count: 100, type: "submitted" },
    { offset: 0, count: 100 },
  ];

  for (const body of requestBodies) {
    try {
      const res = await fetch("https://www.soundon.global/api/album/list", {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Cookie": cookieHeader,
          "Content-Type": "application/json",
          "X-Tt-Passport-Csrf-Token": csrfToken,
          "x-csrf-token": csrfToken,
          "Referer": "https://www.soundon.global/library/list",
        },
        body: JSON.stringify(body),
      });

      console.log(`\nBody: ${JSON.stringify(body)} | Status: ${res.status}`);
      const text = await res.text();
      console.log(`Length: ${text.length}`);
      if (res.status === 200) {
        console.log(`Response snippet: ${text.substring(0, 400)}`);
      } else {
        console.log(`Error body snippet: ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

test().catch(console.error);
