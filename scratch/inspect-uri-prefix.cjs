const fs = require('fs');

async function test() {
  const url = "https://sf-fe.anotecdn.com/obj/anote-fe/soundon/client-main/static/js/index.24851df7.js";
  const res = await fetch(url);
  const text = await res.text();

  const pos = 1259049;
  console.log("Snippet around GetAlbumList:");
  console.log(text.substring(pos - 1500, pos + 1500));
}

test().catch(console.error);
