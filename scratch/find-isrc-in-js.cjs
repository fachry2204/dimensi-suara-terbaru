const fs = require('fs');

async function test() {
  const url = "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js";
  const res = await fetch(url);
  const text = await res.text();

  let idx = 0;
  while ((idx = text.indexOf('.isrc', idx + 1)) !== -1) {
    console.log(`\nFound .isrc at ${idx}:`);
    console.log(text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 200)));
    if (idx > 3000000) break; // limit
  }
}

test().catch(console.error);
