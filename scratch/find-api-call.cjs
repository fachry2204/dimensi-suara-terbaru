const fs = require('fs');

async function test() {
  const url = "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js";
  console.log("Fetching JS bundle...");
  const res = await fetch(url);
  const text = await res.text();
  console.log("Bundle size:", text.length);

  // Search for "/album/list" location
  let idx = 0;
  while ((idx = text.indexOf('"/album/list"', idx + 1)) !== -1) {
    console.log(`\nFound "/album/list" at ${idx}:`);
    console.log(text.substring(Math.max(0, idx - 200), Math.min(text.length, idx + 200)));
  }

  idx = 0;
  while ((idx = text.indexOf("'/album/list'", idx + 1)) !== -1) {
    console.log(`\nFound '/album/list' at ${idx}:`);
    console.log(text.substring(Math.max(0, idx - 200), Math.min(text.length, idx + 200)));
  }
}

test().catch(console.error);
