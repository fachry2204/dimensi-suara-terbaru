const fs = require('fs');

async function test() {
  const jsUrls = [
    "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js",
    "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/shared-standalone.d04d7dfa.js"
  ];

  for (const url of jsUrls) {
    console.log("Fetching", url);
    const res = await fetch(url);
    const text = await res.text();
    console.log("Size:", text.length);

    // Search for API endpoints
    const matches = text.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
    const uniqueMatches = [...new Set(matches)];
    console.log("Found API paths:", uniqueMatches);
  }
}

test().catch(console.error);
