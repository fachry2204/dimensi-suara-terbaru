const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else {
        results.push(fullPath);
      }
    });
  } catch (e) {}
  return results;
}

const uploadsDirs = [
  path.join(process.cwd(), "uploads"),
  path.join(process.cwd(), "public", "uploads"),
  path.join(process.cwd(), "public_backup"),
];

uploadsDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walk(dir);
    console.log(`Directory ${dir} has ${files.length} files:`);
    files.slice(0, 20).forEach(f => console.log("  -", f));
  } else {
    console.log(`Directory ${dir} DOES NOT EXIST.`);
  }
});
