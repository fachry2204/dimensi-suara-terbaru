const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'screens');
const destDir = path.join(process.cwd(), 'src/app/(public)');
fs.mkdirSync(path.join(destDir, 'login'), { recursive: true });
fs.mkdirSync(path.join(destDir, 'register'), { recursive: true });

function migrateFile(filename, destName) {
  let content = fs.readFileSync(path.join(srcDir, filename), 'utf8');
  content = '"use client";\n\n' + content;
  content = content.replace(/import \{ useNavigate \} from 'react-router-dom';/g, 'import { useRouter } from "next/navigation";');
  content = content.replace(/useNavigate\(\)/g, 'useRouter()');
  content = content.replace(/navigate\(/g, 'router.push(');
  content = content.replace(/const navigate = useRouter\(\);/g, 'const router = useRouter();');
  content = content.replace(/\.\.\/utils\/api/g, '@/utils/api');
  content = content.replace(/\.\.\/utils\/colorUtils/g, '@/utils/colorUtils');
  content = content.replace(/\.\.\/constants/g, '@/constants');
  
  // LoginScreen accepts onLogin prop in old app, Next.js doesn't use props for page.
  // So we just replace `export const LoginScreen: React.FC<Props> = ({ onLogin }) => {`
  // with `export default function LoginScreen() {`
  content = content.replace(/interface Props \{[\s\S]*?\}/g, '');
  content = content.replace(/type Props = \{[\s\S]*?\};/g, '');
  content = content.replace(/export const LoginScreen: React\.FC(?:<.*?>)? = \(\{ onLogin \}\) => \{/g, 'export default function LoginScreen() {');
  content = content.replace(/export const RegisterScreen: React\.FC(?:<.*?>)? = \(\{.*?\}\) => \{/g, 'export default function RegisterScreen() {');
  content = content.replace(/export const RegisterScreen: React\.FC(?:<.*?>)? = \(\) => \{/g, 'export default function RegisterScreen() {');
  
  // onLogin(user, data.token) removal
  content = content.replace(/onLogin\(.*?\);/g, '');

  fs.writeFileSync(path.join(destDir, destName, 'page.tsx'), content);
}

migrateFile('LoginScreen.tsx', 'login');
migrateFile('RegisterScreen.tsx', 'register');
console.log('Migrated login and register pages');
