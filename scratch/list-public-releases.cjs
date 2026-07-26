const fs = require('fs');
const path = require('path');

function walk(dir, indent = 0) {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      console.log(`${" ".repeat(indent)}- ${item} ${stat.isDirectory() ? '[DIR]' : `(${stat.size} bytes)`}`);
      if (stat.isDirectory() && indent < 6) {
        walk(full, indent + 2);
      }
    }
  } catch (e) {
    console.log(`Error reading ${dir}: ${e.message}`);
  }
}

console.log("Listing public/uploads/releases:");
walk(path.join(process.cwd(), "public", "uploads", "releases"));
