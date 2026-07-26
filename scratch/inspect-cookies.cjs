const fs = require('fs');
const path = require('path');

const sessionPath = path.join(process.cwd(), '.soundon-session', 'storage-state.json');
if (fs.existsSync(sessionPath)) {
  const raw = fs.readFileSync(sessionPath, 'utf8');
  const state = JSON.parse(raw);
  console.log("Cookies:");
  state.cookies.forEach(c => {
    console.log(`- ${c.name} (domain: ${c.domain}, expires: ${c.expires ? new Date(c.expires * 1000).toISOString() : 'session'})`);
  });
} else {
  console.log("No file");
}
