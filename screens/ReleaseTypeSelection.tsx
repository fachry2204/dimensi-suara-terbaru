import React from 'react';
import { Music, Disc, ArrowRight } from 'lucide-react';
import { ReleaseType } from '../src/types';

interface Props {
  onSelect: (type: ReleaseType) => void;
}

export const ReleaseTypeSelection: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="h-full flex flex-col items-center justify-start pt-4 p-4 animate-fade-in-up">
      <div className="text-center mb-6">
         <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
            What are you releasing?
         </h1>
         <p className="text-slate-600 font-medium text-sm">Select the format that matches your music.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl justify-center">
        {/* Single Card */}
        <button 
          onClick={() => onSelect('SINGLE')}
          className="flex-1 flex flex-col items-center p-5 bg-white rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 border border-transparent hover:border-blue-200 group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
             <Music size={20} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
          </div>
          
          <h2 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">Single Song</h2>
          <p className="text-slate-500 mb-4 text-center leading-relaxed text-sm">
            Upload a single track. Perfect for your latest hit or a standalone release.
          </p>
          
          <div className="mt-auto flex items-center text-blue-500 font-medium text-xs opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            Select Single <ArrowRight size={14} className="ml-1" />
          </div>
        </button>

        {/* Album Card */}
        <button 
           onClick={() => onSelect('ALBUM')}
           className="flex-1 flex flex-col items-center p-5 bg-white rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 border border-transparent hover:border-purple-200 group relative overflow-hidden"
        >
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

           <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
             <Disc size={20} className="text-purple-500 group-hover:scale-110 transition-transform duration-300" />
          </div>

          <h2 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-purple-600 transition-colors">EP / Album</h2>
          <p className="text-slate-500 mb-4 text-center leading-relaxed text-sm">
             Compile two or more tracks. Ideal for EPs, full albums, or compilations.
          </p>

           <div className="mt-auto flex items-center text-purple-600 font-medium text-xs opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            Select Album <ArrowRight size={14} className="ml-1" />
          </div>
        </button>
      </div>
    </div>
  );
};
