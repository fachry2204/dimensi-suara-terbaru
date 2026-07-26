const fs = require('fs');
const path = require('path');

function searchForCovers(rootDir) {
  console.log("Searching root:", rootDir);
  let found = [];

  function walk(dir) {
    try {
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (!item.startsWith('.') && item !== 'node_modules' && item !== '$RECYCLE.BIN') {
              walk(full);
            }
          } else if (/\.(jpg|jpeg|png)$/i.test(item)) {
            if (full.toLowerCase().includes('cover') || full.toLowerCase().includes('upload') || full.toLowerCase().includes('release')) {
              found.push(full);
            }
          }
        } catch {}
      }
    } catch {}
  }

  walk(rootDir);
  return found;
}

const parentDir = path.resolve(process.cwd(), '..');
const results = searchForCovers(parentDir);
console.log(`Found ${results.length} cover art image files in parent directories:`);
results.slice(0, 30).forEach(f => console.log(" -", f));
