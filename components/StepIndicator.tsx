import React from 'react';
import { ReleaseType, Step } from '@/types';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number;
  onStepClick?: (step: Step) => void;
  releaseType?: ReleaseType;
}

const getSteps = (releaseType?: ReleaseType) => releaseType === 'ALBUM'
  ? [
      { id: Step.INFO, label: "Info Album", desc: "Cover & Metadata" },
      { id: Step.DETAILS, label: "Upload Track", desc: "Audio & Metadata Track" },
      { id: Step.REVIEW, label: "Review", desc: "Finalisasi" },
    ]
  : [
      { id: Step.INFO, label: "Info & Track", desc: "Audio & Metadata" },
      { id: Step.DETAILS, label: "Cover & Tanggal", desc: "Cover Art & Tanggal Rilis" },
      { id: Step.REVIEW, label: "Review", desc: "Finalisasi" },
    ];

export const StepIndicator: React.FC<Props> = ({ currentStep, onStepClick, releaseType }) => {
  const steps = getSteps(releaseType);
  return (
    <div className="w-full mb-8">
      <div className="flex w-full bg-slate-50 p-1 rounded-xl border border-slate-200">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const canClick = !!onStepClick && step.id <= currentStep;

          return (
            <div 
              key={step.id} 
              className={`flex-1 relative flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' 
                  : canClick 
                    ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer' 
                    : 'text-slate-300 cursor-default'
              }`}
              onClick={() => { if (canClick) onStepClick!(step.id); }}
            >
               <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                    </div>
                  ) : (
                    <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {step.id}
                    </span>
                  )}
                  <span className={`text-sm font-semibold tracking-tight ${isActive ? 'text-slate-800' : ''}`}>
                    {step.label}
                  </span>
               </div>
               
               {/* Optional Description - visible on larger screens */}
               <span className={`text-[10px] font-medium mt-0.5 hidden sm:block ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
                 {step.desc}
               </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
