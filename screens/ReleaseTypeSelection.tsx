import React from 'react';
import { Music, Disc, ArrowRight } from 'lucide-react';
import { ReleaseType } from '@/types';

interface Props {
  onSelect: (type: ReleaseType) => void;
}

export const ReleaseTypeSelection: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="release-type-selection h-full flex flex-col items-center justify-start px-4 py-8 animate-fade-in-up">
      <div className="text-center mb-8">
         <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
            What are you releasing?
         </h1>
         <p className="text-slate-600 font-medium text-sm">Select the format that matches your music.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
        {/* Single Card */}
        <button 
          type="button"
          onClick={() => onSelect('SINGLE')}
          className="release-type-card w-full min-h-[230px] flex flex-col items-start p-6 bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all duration-300 group relative overflow-hidden text-left focus:outline-none focus:ring-4 focus:ring-blue-500/15"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
             <Music size={20} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
          </div>
          
          <h2 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Single Song</h2>
          <p className="text-slate-500 mb-5 leading-relaxed text-sm">
            Upload a single track. Perfect for your latest hit or a standalone release.
          </p>
          
          <div className="mt-auto flex items-center text-blue-600 font-bold text-xs">
            Select Single <ArrowRight size={14} className="ml-1" />
          </div>
        </button>

        {/* Album Card */}
        <button 
           type="button"
           onClick={() => onSelect('ALBUM')}
           className="release-type-card w-full min-h-[230px] flex flex-col items-start p-6 bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300 transition-all duration-300 group relative overflow-hidden text-left focus:outline-none focus:ring-4 focus:ring-purple-500/15"
        >
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

           <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
             <Disc size={20} className="text-purple-500 group-hover:scale-110 transition-transform duration-300" />
          </div>

          <h2 className="text-base font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">EP / Album</h2>
          <p className="text-slate-500 mb-5 leading-relaxed text-sm">
             Compile two or more tracks. Ideal for EPs, full albums, or compilations.
          </p>

           <div className="mt-auto flex items-center text-purple-600 font-bold text-xs">
            Select Album <ArrowRight size={14} className="ml-1" />
          </div>
        </button>
      </div>
    </div>
  );
};
