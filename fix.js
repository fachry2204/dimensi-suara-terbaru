const fs = require('fs');
let file = fs.readFileSync('components/ReleaseDetailModal.tsx', 'utf-8');

file = file.replace('import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera } from \\'lucide-react\\';', 
'import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera, ExternalLink, PlayCircle } from \\'lucide-react\\';');

file = file.replace(/\\(data as any\\)/g, '(release as any)');
file = file.replace(/const d = data as any;/g, 'const d = release as any;');

fs.writeFileSync('components/ReleaseDetailModal.tsx', file);
