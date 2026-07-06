const fs = require('fs');

const step4 = fs.readFileSync('screens/wizard/Step4Review.tsx', 'utf-8');
const modal = fs.readFileSync('components/ReleaseDetailModal.tsx', 'utf-8');

const sec1Start = step4.indexOf('{/* SECTION 1: RELEASE METADATA SUMMARY */}');
const sec2Start = step4.indexOf('{/* SECTION 2: DETAILED TRACK METADATA */}');
const sec1Str = step4.substring(sec1Start, sec2Start);

const submitSectionStart = step4.indexOf('<div className="mt-8 flex flex-col items-end');
let sec2Str = step4.substring(sec2Start, submitSectionStart);

// Clean up trailing divs or spacing
sec2Str = sec2Str.trim();
if (sec2Str.endsWith('</div>')) {
    // it usually doesn't need to strip anything since it ends exactly before the submit section
}

// Fix data variables to release variables
let sec1Clean = sec1Str.replace(/data\./g, 'release.');
let sec2Clean = sec2Str.replace(/data\./g, 'release.');

// Add MetaItem component definition
let metaItemDef = `const MetaItem = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-center">
    <div className="flex items-center gap-1.5 text-slate-400 mb-1.5 uppercase tracking-wider">
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </div>
    <div className="text-sm font-bold text-slate-800 line-clamp-2">{value || "-"}</div>
  </div>
);`;

let newModal = modal;
newModal = newModal.replace('export const ReleaseDetailModal', metaItemDef + '\n\nexport const ReleaseDetailModal');

const topStart = newModal.indexOf('<div className="flex flex-col md:flex-row gap-8 items-start mb-8');
const tabsStart = newModal.indexOf('{/* Navigation Tabs */}');

const headerSection = fs.readFileSync('header.txt', 'utf-8');

newModal = newModal.substring(0, topStart) + headerSection + newModal.substring(tabsStart);

const infoContentStart = newModal.indexOf("{activeTab === 'INFO' && (");
const distTabStartStr = '{/* TAB 2: DISTRIBUTION ADMIN */}';
const distTabStart = newModal.indexOf(distTabStartStr);

let newInfoContent = `{activeTab === 'INFO' && (
                    <div className="space-y-8 animate-fade-in-up">
                        ${sec1Clean}
                        ${sec2Clean}
                    </div>
                )}
                `;

let distActualStart = newModal.substring(0, distTabStart).lastIndexOf('{userRole === \'Admin\' && activeTab === \'DISTRIBUTION\'');
if (distActualStart === -1 || distTabStart - distActualStart > 500) {
   distActualStart = newModal.substring(0, distTabStart).lastIndexOf('{userRole');
}
if (distActualStart === -1 || distTabStart - distActualStart > 500) {
   distActualStart = distTabStart;
}

newModal = newModal.substring(0, infoContentStart) + newInfoContent + newModal.substring(distActualStart);

const resolvedGenreReplacements = '  const resolvedGenreName = release.genre || "";\n  const resolvedSubGenreName = (release as any).subGenre || "";\n';
newModal = newModal.replace('const upcDisplay = upcInput || release.upc || \'\';', resolvedGenreReplacements + '\n  const upcDisplay = upcInput || release.upc || \'\';');

fs.writeFileSync('components/ReleaseDetailModal_new.tsx', newModal);
console.log('Done replacement!');
