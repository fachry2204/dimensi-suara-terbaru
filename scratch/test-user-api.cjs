const fs = require('fs');
const path = require('path');

async function test() {
  const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
  if (!fs.existsSync(sessionPath)) return;

  const state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';

  const res = await fetch("https://www.soundon.global/api/user?withPhone=false", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Cookie": cookieHeader,
      "Accept": "application/json, text/plain, */*",
    },
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

test().catch(console.error);
