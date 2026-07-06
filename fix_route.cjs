const fs = require('fs');
let file = fs.readFileSync('src/app/api/releases/[id]/route.ts', 'utf-8');

file = file.replace(/\{ params \}: \{ params: \{ id: string \} \}/g, 'props: { params: Promise<{ id: string }> }');
file = file.replace(/try \{/g, 'try {\n    const params = await props.params;');

fs.writeFileSync('src/app/api/releases/[id]/route.ts', file);
