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
  console.log("Cookie count:", state.cookies ? state.cookies.length : 0);

  const cookieHeader = state.cookies ? state.cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';
  console.log("Cookie header length:", cookieHeader.length);

  // Test fetch library list
  const res = await fetch("https://www.soundon.global/library/list?type=submitted", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Cookie": cookieHeader,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    },
    redirect: "manual"
  });

  console.log("Status:", res.status);
  console.log("Location:", res.headers.get("location"));
  
  const text = await res.text();
  console.log("Response text length:", text.length);

  // Check if __NEXT_DATA__ exists
  const nextDataMatch = text.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextDataMatch) {
    console.log("__NEXT_DATA__ found! Length:", nextDataMatch[1].length);
    fs.writeFileSync('scratch/next_data.json', nextDataMatch[1]);
  } else {
    console.log("No __NEXT_DATA__ tag.");
  }

  // Check for any initial state script or json tags
  const jsonScripts = text.match(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/gs);
  if (jsonScripts) {
    console.log("JSON scripts found:", jsonScripts.length);
  }

  // Search for "AMMAKKU" in the response text
  const matchIdx = text.toLowerCase().indexOf("ammakku");
  console.log("AMMAKKU found index in raw HTML:", matchIdx);

  // Save html snippet around match if found
  if (matchIdx !== -1) {
    console.log("Snippet:", text.substring(Math.max(0, matchIdx - 100), matchIdx + 200));
  } else {
    fs.writeFileSync('scratch/so_page.html', text);
    console.log("Saved page to scratch/so_page.html");
  }
}

test().catch(console.error);
