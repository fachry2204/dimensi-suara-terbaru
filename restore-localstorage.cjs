const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Only safely replace when we find exact match for what was removed
      const patterns = [
        {
          from: /const token = '';( \/\/.*)?/g,
          to: "const token = typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '';$1"
        }
      ];

      patterns.forEach(p => {
        if (p.from.test(content)) {
          content = content.replace(p.from, "const token = typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '';");
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir(path.join(process.cwd(), 'screens'));
console.log('Done restoring localStorage token getters');
