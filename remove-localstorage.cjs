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

      // Replace common localStorage token gets
      const patterns = [
        {
          from: /const token = localStorage\.getItem\('cms_token'\)( \/\/.*)?;/g,
          to: "const token = '';"
        },
        {
          from: /const token = localStorage\.getItem\('cms_token'\) \|\| '';/g,
          to: "const token = '';"
        },
        {
          from: /const \[token\] = useState\(localStorage\.getItem\('cms_token'\) \|\| ''\);/g,
          to: "const [token] = useState('');"
        }
      ];

      patterns.forEach(p => {
        if (p.from.test(content)) {
          content = content.replace(p.from, p.to);
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
replaceInDir(path.join(process.cwd(), 'src'));
console.log('Done replacing localStorage token getters');
