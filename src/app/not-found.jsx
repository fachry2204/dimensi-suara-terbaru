'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MessageSquare, Users, Send } from 'lucide-react';

export default function Error404() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 md:p-12 font-sans overflow-hidden">
      <div className="max-w-[1200px] w-full grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        {/* Left Side */}
        <div className="space-y-6 z-10">
          <h1 className="text-6xl md:text-[80px] font-black text-slate-900 leading-none tracking-tight">
            Oops!
          </h1>
          <h2 className="text-3xl md:text-[42px] font-black text-[#ffb800] leading-tight drop-shadow-sm">
            Something Went Wrong!
          </h2>
          <p className="text-slate-600 text-lg md:text-xl font-semibold mb-8">
            Don't worry our team is here to help
          </p>

          <div className="space-y-5 mb-10 pt-4">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 flex items-center justify-center">
                 <MessageSquare className="text-[#ffb800] w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-slate-800 font-bold text-lg group-hover:text-[#ffb800] transition-colors">Question and answers</span>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 flex items-center justify-center">
                 <Users className="text-[#ffb800] w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-slate-800 font-bold text-lg group-hover:text-[#ffb800] transition-colors">Community forum</span>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 flex items-center justify-center">
                 <Send className="text-[#ffb800] w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-slate-800 font-bold text-lg group-hover:text-[#ffb800] transition-colors">Send support request</span>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={() => router.back()}
              className="bg-[#ffb800] hover:bg-[#e6a600] text-slate-900 font-bold text-lg px-12 py-4 rounded-full transition-all duration-300 hover:shadow-[0_8px_20px_rgba(255,184,0,0.4)] shadow-md transform hover:-translate-y-1"
            >
              Live Support
            </button>
          </div>
        </div>

        {/* Right Side */}
        <div className="relative flex flex-col justify-center items-center mt-12 md:mt-0 z-0">
          {/* Big 404 Background Text */}
          <div className="absolute font-black text-[#2b333e] tracking-tighter flex items-center justify-center w-full" style={{ fontSize: 'clamp(140px, 18vw, 240px)', lineHeight: 0.8, top: '10%' }}>
            <span className="-rotate-6 mr-2 md:mr-6 drop-shadow-xl">4</span>
            <span className="rotate-3 drop-shadow-xl">0</span>
            <span className="-rotate-6 ml-2 md:ml-6 drop-shadow-xl">4</span>
          </div>
          
          <div className="relative z-10 w-full max-w-[450px] mx-auto mt-24 md:mt-32 hover:scale-105 transition-transform duration-500">
            {/* The generated robot image */}
            <Image 
              src="/robot-404.png" 
              alt="404 Robot" 
              width={500} 
              height={500}
              className="object-contain w-full h-auto drop-shadow-2xl animate-[pulse_4s_infinite]"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}