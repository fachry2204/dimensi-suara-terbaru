const fs = require('fs');
let file = fs.readFileSync('components/ReleaseDetailModal.tsx', 'utf-8');

file = file.replace(/from '\.\.\/types'/g, "from '../src/types'");
file = file.replace(/from '\.\.\/utils/g, "from '../src/utils");

fs.writeFileSync('components/ReleaseDetailModal.tsx', file);
