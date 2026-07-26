const fs = require('fs');

async function test() {
  const url = "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js";
  console.log("Fetching JS bundle...");
  const res = await fetch(url);
  const text = await res.text();
  console.log("Bundle downloaded, size:", text.length);

  // Search for string literals containing /api/ or http
  const matches = text.match(/"\/[a-zA-Z0-9_\-\/]{3,50}"|'\/[a-zA-Z0-9_\-\/]{3,50}'/g) || [];
  const apiMatches = [...new Set(matches)].filter(m => 
    m.includes('release') || m.includes('album') || m.includes('library') || m.includes('song') || m.includes('track') || m.includes('music') || m.includes('submitted')
  );
  console.log("Matching endpoint paths:", apiMatches);

  // Search for queries or URL patterns around "submitted"
  let pos = 0;
  while ((pos = text.indexOf("submitted", pos + 1)) !== -1) {
    console.log("\nMatch around 'submitted':", text.substring(Math.max(0, pos - 100), Math.min(text.length, pos + 100)));
    if (pos > 50000) break; // limit
  }
}

test().catch(console.error);
