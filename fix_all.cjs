const fs = require('fs');

let file = fs.readFileSync('components/ReleaseDetailModal_new.tsx', 'utf-8');

file = file.replace('import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera } from \'lucide-react\';', 
'import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera, ExternalLink, PlayCircle } from \'lucide-react\';');

file = file.replace(/\(data as any\)/g, '(release as any)');
file = file.replace(/const d = data as any;/g, 'const d = release as any;');
file = file.replace(/from '\.\.\/types'/g, "from '../src/types'");
file = file.replace(/from '\.\.\/utils/g, "from '../src/utils");

const regex = /<div className="overflow-x-auto">[\s\S]*?<\/table>\s*<\/div>/;

if (regex.test(file)) {
    const cardContent = `
            <div className="space-y-3">
              {release.tracks.map((track) => {
                const anyTrack: any = track;
                const audioSource: string =
                  typeof track.audioFile === 'string' && track.audioFile.trim().length > 0
                    ? track.audioFile
                    : (typeof anyTrack.tempAudioPath === 'string' ? anyTrack.tempAudioPath : '');
                const audioDisplay =
                  audioSource && audioSource.includes('/')
                    ? audioSource.split('/').slice(-1)[0]
                    : (audioSource || (track.audioFile instanceof File ? track.audioFile.name : 'No File'));
                const hasClip =
                  !!track.audioClip ||
                  (typeof anyTrack.tempClipPath === 'string' && anyTrack.tempClipPath.trim().length > 0);
                
                return (
                  <div key={track.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-200 pb-3 mb-3 gap-3">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded flex items-center justify-center text-xs">{track.trackNumber}</span>
                        {track.title}
                      </h4>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className={\`px-2 py-1 rounded text-[10px] font-bold uppercase \${track.explicitLyrics === 'Yes' ? 'bg-red-100 text-red-700' : track.explicitLyrics === 'Clean' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}\`}>
                          {track.explicitLyrics === 'Yes' ? 'Explicit' : track.explicitLyrics === 'Clean' ? 'Clean' : 'Standard'}
                        </span>
                        <div className="flex gap-2">
                          {typeof track.audioFile === 'string' && track.audioFile.startsWith('http') && (
                            <a href={track.audioFile} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center justify-center" title="Download Audio">
                              <Download size={14} />
                            </a>
                          )}
                          {typeof track.audioClip === 'string' && track.audioClip.startsWith('http') && (
                            <a href={track.audioClip} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors flex items-center justify-center" title="Download Clip">
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Audio File</p>
                        <div className="text-xs text-blue-600 flex items-center gap-1.5 truncate" title={audioSource}>
                          <FileAudio size={14} /> <span className="truncate">{audioDisplay}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">ISRC</p>
                        <div className="text-xs font-mono font-medium text-slate-700">{track.isrc || '-'}</div>
                      </div>
                      <div className="sm:col-span-2 md:col-span-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Credits</p>
                        <div className="text-xs text-slate-600 truncate" title={\`C: \${track.composer} | L: \${track.lyricist}\`}>
                          <span className="text-slate-400">C:</span> {track.composer} <span className="text-slate-400 ml-1">L:</span> {track.lyricist}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Clip Status</p>
                        <div className="text-xs font-medium">
                          {hasClip ? (
                            <span className="text-green-600 flex items-center gap-1.5"><CheckCircle size={14} /> Ready</span>
                          ) : (
                            <span className="text-orange-500 flex items-center gap-1.5"><AlertTriangle size={14} /> Missing</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>`;
    file = file.replace(regex, cardContent);
    console.log('Successfully replaced table with cards.');
} else {
    console.log('Table not found.');
}

fs.writeFileSync('components/ReleaseDetailModal_new.tsx', file);
