const fs = require('fs');

async function test() {
  const url = "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js";
  const res = await fetch(url);
  const text = await res.text();

  let idx = 0;
  while ((idx = text.indexOf('.GetAlbumList(', idx + 1)) !== -1) {
    console.log(`\nFound .GetAlbumList call at ${idx}:`);
    console.log(text.substring(Math.max(0, idx - 200), Math.min(text.length, idx + 400)));
  }
}

test().catch(console.error);
