const fs = require('fs');
const path = require('path');

const srcFile = path.join(process.cwd(), 'screens/Dashboard.tsx');
const destFile = path.join(process.cwd(), 'src/app/(dashboard)/dashboard/page.tsx');

let code = fs.readFileSync(srcFile, 'utf-8');

// Replace react-router-dom imports
code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react-router-dom['"];/, (match, p1) => {
    let newImports = [];
    if (p1.includes('useNavigate')) newImports.push(`import { useRouter } from 'next/navigation';`);
    if (p1.includes('Link')) newImports.push(`import Link from 'next/link';`);
    return newImports.join('\n');
});

// Replace useNavigate with useRouter
code = code.replace(/const\s+navigate\s*=\s*useNavigate\(\);/g, 'const router = useRouter();');
code = code.replace(/navigate\(/g, 'router.push(');

// Remove Props interface and change component signature
code = code.replace(/interface\s+Props\s*\{[^}]+\}/, '');
code = code.replace(/export\s+const\s+Dashboard:\s*React\.FC<Props>\s*=\s*\(\{\s*releases,\s*token\s*\}\)\s*=>/, 'export default function DashboardPage()');

// Inject data fetching
const dataFetchingLogic = `
  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const data = await api.getReleases('');
        setReleases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch releases', err);
      }
    };
    fetchReleases();
  }, []);
`;

// Insert the logic right after component start
code = code.replace(/export\s+default\s+function\s+DashboardPage\(\)\s*\{/, `export default function DashboardPage() {\n${dataFetchingLogic}`);

// Add 'use client'
code = `"use client";\n\n` + code;

// Write file
fs.mkdirSync(path.dirname(destFile), { recursive: true });
fs.writeFileSync(destFile, code);
console.log('Migrated Dashboard.tsx');
