const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../src/app/api/uploads');

const filesToFix = [
  '[uploadId]/chunk/route.ts',
  '[uploadId]/status/route.ts',
  '[uploadId]/complete/route.ts',
  '[uploadId]/route.ts'
];

for (const relPath of filesToFix) {
  const fullPath = path.join(basePath, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Change params type to Promise and await it
    content = content.replace(
      /export async function (GET|POST|DELETE)\(req: Request, \{ params \}: \{ params: \{ uploadId: string \} \}\) \{/,
      'export async function $1(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {'
    );

    // Some routes might not have the type signature but just `{ params }`
    content = content.replace(
      /export async function (GET|POST|DELETE)\(req: Request, \{ params \}: any\) \{/,
      'export async function $1(req: Request, { params }: any) {'
    );

    // Replace const { uploadId } = params; with const { uploadId } = await params;
    content = content.replace(
      /const \{ uploadId \} = params;/g,
      'const { uploadId } = await params;'
    );

    fs.writeFileSync(fullPath, content);
  }
}

console.log('Fixed await params in all upload routes');
