import React from 'react';
import { ReleaseData, ReleaseType } from '@/types';
import { TextInput } from '../../components/Input';
import { Calendar, Globe, Barcode, Disc } from 'lucide-react';
import socialLogo from '../../assets/platforms/social.svg';
import youtubeMusicLogo from '../../assets/platforms/youtube-music.svg';
import allDspLogo from '../../assets/platforms/alldsp.svg';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => void;
  releaseType?: ReleaseType;
  userRole?: string;
}

export const Step3ReleaseDetail: React.FC<Props> = ({ data, updateData, releaseType, userRole }) => {
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const originalDateInputRef = React.useRef<HTMLInputElement>(null);
  
  const minDate = new Date();
  // Admin can select any date (including past or immediate future)
  if (userRole !== 'Admin') {
    minDate.setDate(minDate.getDate() + 14);
  } else {
    // For admin, allow any date by setting min very far back or just today
    minDate.setFullYear(2000); 
  }
  const minDateStr = minDate.toISOString().split('T')[0];
  const isDateInvalid = userRole !== 'Admin' && data.plannedReleaseDate && data.plannedReleaseDate < minDateStr;

  const preReleaseSocialRef = React.useRef<HTMLInputElement>(null);
  const preReleaseYTRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-full max-w-none">
      <div className="text-center mb-8">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Release Specifics</h2>
        <p className="text-xs text-slate-600">Distribution details and dates.</p>
      </div>

      {releaseType !== 'ALBUM' && (
      <div className="border border-gray-200 rounded-lg p-6 relative mt-6 mb-8">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-4 bg-white px-2">Distribution History</h3>
        
        <div className="space-y-4">
            <label className={`flex items-center p-4 rounded-lg border cursor-pointer select-none transition-all ${data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
                <div 
                    style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', borderRadius: '50%' }}
                    className={`border flex items-center justify-center mr-4 shrink-0 pointer-events-none ${data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}
                >
                    {data.isNewRelease && <div style={{ width: '10px', height: '10px', borderRadius: '50%' }} className="bg-blue-500 pointer-events-none"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === true} 
                    onChange={() => updateData({ isNewRelease: true })}
                    className="hidden"
                />
                <span className={`text-xs font-medium select-none ${data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>No, this is a brand new release</span>
            </label>
            
            <label className={`flex items-center p-4 rounded-lg border cursor-pointer select-none transition-all ${!data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
                 <div 
                    style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', borderRadius: '50%' }}
                    className={`border flex items-center justify-center mr-4 shrink-0 pointer-events-none ${!data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}
                >
                    {!data.isNewRelease && <div style={{ width: '10px', height: '10px', borderRadius: '50%' }} className="bg-blue-500 pointer-events-none"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === false}
                    onChange={() => updateData({ isNewRelease: false })}
                    className="hidden"
                />
                <span className={`text-xs font-medium select-none ${!data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>Yes, this album has been released before</span>
            </label>
        </div>

        {!data.isNewRelease && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-down space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">Tanggal Rilis Asli</label>
                        <div className="relative group max-w-xs">
                            <input 
                               ref={originalDateInputRef}
                               type="date" 
                               value={data.originalReleaseDate}
                               onChange={(e) => updateData({ originalReleaseDate: e.target.value })}
                               onClick={(e) => (e.target as any).showPicker?.()}
                               className="w-full px-4 py-1.5 text-sm text-black border border-gray-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all pl-4 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 font-sans font-semibold cursor-pointer"
                            />
                           <div 
                               onClick={() => originalDateInputRef.current?.showPicker()}
                               className="absolute right-2 top-1 bottom-1 aspect-square rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm border bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100"
                           >
                               <Calendar size={16} />
                           </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Barcode size={16} className="text-blue-500" />
                            UPC Code (If previously released)
                        </label>
                        <TextInput 
                            label=""
                            value={data.upc}
                            onChange={(e) => updateData({ upc: e.target.value })}
                            placeholder="Enter previous UPC code"
                            className="w-full px-4 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all font-sans"
                        />
                    </div>
                    
                    {releaseType === 'SINGLE' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Disc size={16} className="text-blue-500" />
                                ISRC Code (If previously released)
                            </label>
                            <TextInput 
                                label=""
                                value={data.isrc}
                                onChange={(e) => updateData({ isrc: e.target.value })}
                                placeholder="Enter previous ISRC code"
                                className="w-full px-4 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all font-sans"
                            />
                        </div>
                    )}
                 </div>
            </div>
        )}
      </div>
      )}

      <div className="border border-gray-200 rounded-lg p-6 relative mt-6 mb-8">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-4 bg-white px-2">Distribution Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'SOCIAL', label: 'Social Media', logo: socialLogo },
            { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: youtubeMusicLogo },
            { id: 'ALL_DSP', label: 'All DSP', logo: allDspLogo },
          ].map(opt => {
            const selected = Array.isArray(data.distributionTargets) && data.distributionTargets.some(t => t.id === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  const current = Array.isArray(data.distributionTargets) ? [...data.distributionTargets] : [];
                  const idx = current.findIndex(t => t.id === opt.id);
                  if (idx >= 0) {
                    current.splice(idx, 1);
                  } else {
                    current.push({ id: opt.id, label: opt.label, logo: opt.logo });
                  }
                  updateData({ distributionTargets: current });
                }}
                className={`flex items-center gap-3 p-4 rounded-lg border ${selected ? 'bg-blue-50 border-blue-200' : 'border-gray-200'} hover:border-blue-200 transition-colors text-left select-none`}
              >
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                  <img src={typeof opt.logo === 'string' ? opt.logo : (opt.logo as any)?.src || opt.logo} alt={opt.label} className="w-12 h-12 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-black truncate">{opt.label}</div>
                  <div className="text-xs text-slate-400 truncate">{selected ? 'Selected' : 'Click to select'}</div>
                </div>
                <div 
                  style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', borderRadius: '4px' }}
                  className={`border shrink-0 pointer-events-none ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} flex items-center justify-center`}
                >
                  {selected && <div style={{ width: '10px', height: '10px', backgroundColor: '#ffffff', borderRadius: '2px' }}></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(() => {
        let preReleaseMinMax = "";
        if (data.plannedReleaseDate) {
          const planned = new Date(data.plannedReleaseDate);
          const preReleaseDate = new Date(planned);
          preReleaseDate.setDate(preReleaseDate.getDate() - 7);
          preReleaseMinMax = preReleaseDate.toISOString().split('T')[0];
        }

        return (
          <div className="border border-gray-200 rounded-lg p-6 relative mt-6">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-4 bg-white px-2">Schedule</h3>
            <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">Tanggal Rilis Direncanakan</label>
                <div className="relative group max-w-xs">
                    <input 
                        ref={dateInputRef}
                        type="date" 
                        min={minDateStr}
                        value={data.plannedReleaseDate}
                        onChange={(e) => {
                            const newDate = e.target.value;
                            if (newDate) {
                                const planned = new Date(newDate);
                                const preReleaseDate = new Date(planned);
                                preReleaseDate.setDate(preReleaseDate.getDate() - 7);
                                const targetStr = preReleaseDate.toISOString().split('T')[0];
                                updateData({
                                    plannedReleaseDate: newDate,
                                    preReleaseSocialMedia: targetStr,
                                    preReleaseYoutubeMusic: targetStr
                                });
                            } else {
                                updateData({
                                    plannedReleaseDate: newDate,
                                    preReleaseSocialMedia: "",
                                    preReleaseYoutubeMusic: ""
                                });
                            }
                        }}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        className={`w-full px-4 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 transition-all pl-4 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 text-black font-sans font-semibold cursor-pointer ${
                            isDateInvalid 
                                ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500/20 bg-red-50' 
                                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                    <div 
                        onClick={() => dateInputRef.current?.showPicker()}
                        className={`absolute right-2 top-1 bottom-1 aspect-square rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm border ${
                            isDateInvalid ? 'bg-red-100 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100'
                        }`}
                    >
                        <Calendar size={16} />
                    </div>
                </div>
                {isDateInvalid && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">
                        Date must be at least 14 days from today.
                    </p>
                )}
                <p className="text-xs text-blue-500 mt-2 font-medium">
                    Recommended: Set date at least 14 days from today
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">Pre-Release Social Media</label>
                    <div className="relative group max-w-xs">
                        <input 
                            ref={preReleaseSocialRef}
                            type="date" 
                            min={preReleaseMinMax || minDateStr}
                            max={preReleaseMinMax || undefined}
                            disabled={!data.plannedReleaseDate}
                            value={data.preReleaseSocialMedia || ''}
                            onChange={(e) => updateData({ preReleaseSocialMedia: e.target.value })}
                            onClick={(e) => data.plannedReleaseDate && (e.target as any).showPicker?.()}
                            className="w-full px-4 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all pl-4 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 text-black font-sans font-semibold bg-white disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div 
                            onClick={() => data.plannedReleaseDate && preReleaseSocialRef.current?.showPicker()}
                            className={`absolute right-2 top-1 bottom-1 aspect-square rounded flex items-center justify-center border shadow-sm transition-colors ${
                                data.plannedReleaseDate 
                                    ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer' 
                                    : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                            }`}
                        >
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">Pre-Release YouTube Music</label>
                    <div className="relative group max-w-xs">
                        <input 
                            ref={preReleaseYTRef}
                            type="date" 
                            min={preReleaseMinMax || minDateStr}
                            max={preReleaseMinMax || undefined}
                            disabled={!data.plannedReleaseDate}
                            value={data.preReleaseYoutubeMusic || ''}
                            onChange={(e) => updateData({ preReleaseYoutubeMusic: e.target.value })}
                            onClick={(e) => data.plannedReleaseDate && (e.target as any).showPicker?.()}
                            className="w-full px-4 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all pl-4 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 text-black font-sans font-semibold bg-white disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div 
                            onClick={() => data.plannedReleaseDate && preReleaseYTRef.current?.showPicker()}
                            className={`absolute right-2 top-1 bottom-1 aspect-square rounded flex items-center justify-center border shadow-sm transition-colors ${
                                data.plannedReleaseDate 
                                    ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer' 
                                    : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                            }`}
                        >
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

