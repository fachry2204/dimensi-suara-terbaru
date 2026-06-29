const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(public)/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\} catch \(err: any\) \{\s*console\.error\(err\);\s*setError/g,
  `} catch (err: any) {\n      // Prevent red overlay in Next.js\n      setError`
);

fs.writeFileSync(filePath, content);
console.log('Fixed login page console.error');
