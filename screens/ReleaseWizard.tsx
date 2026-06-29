
import React, { useState, useEffect } from 'react';
import { ReleaseType, ReleaseData, Step } from '@/types';
import { StepIndicator } from '../components/StepIndicator';
import { Step1ReleaseInfo } from './wizard/Step1ReleaseInfo';
import { Step2TrackInfo } from './wizard/Step2TrackInfo';
import { Step3ReleaseDetail } from './wizard/Step3ReleaseDetail';
import { Step4Review } from './wizard/Step4Review';
import { ChevronLeft, ChevronRight, AlertTriangle, X, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface Props {
  type: ReleaseType;
  onBack: () => void;
  onSave: (data: ReleaseData) => void; // New prop to bubble up data
  initialData?: ReleaseData | null; // For viewing/editing
  userRole?: string;
}

const INITIAL_DATA: ReleaseData = {
  coverArt: null,
  upc: "",
  title: "",
  language: "",
  primaryArtists: [""], 
  label: "",
  genre: "",
  pLine: "",
  cLine: "",
  version: "",
  releaseVersion: "Original",
  tracks: [],
  isNewRelease: true,
  originalReleaseDate: "",
  plannedReleaseDate: ""
};

export const ReleaseWizard: React.FC<Props> = ({ type, onBack, onSave, initialData, userRole }) => {
  const [currentStep, setCurrentStep] = useState<number>(Step.INFO);
  const [showExitModal, setShowExitModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showMissingWarning, setShowMissingWarning] = useState(false);
  const [showCoverProcessingWarning, setShowCoverProcessingWarning] = useState(false);
  const [isProcessingCover, setIsProcessingCover] = useState(false);
  const [showAudioProcessingWarning, setShowAudioProcessingWarning] = useState(false);
  const [userType, setUserType] = useState<'Company' | 'Personal' | null>(null);
  
  const [data, setData] = useState<ReleaseData>(() => initialData ? initialData : INITIAL_DATA);

  // If viewing existing data, we might want to ensure tracks exist
  useEffect(() => {
    if (initialData) {
        setData(initialData);
    }
    
    // Fetch user type for validation purposes
    const fetchUserType = async () => {
        const token = '';
        if (token) {
            try {
                const profile = await api.getProfile(token);
                const type = (profile.account_type === 'Company' || profile.account_type === 'COMPANY') ? 'Company' : 'Personal';
                setUserType(type);
            } catch (error) {
                console.error("Failed to fetch user profile in Wizard", error);
            }
        }
    };
    fetchUserType();
  }, [initialData]);

  const updateData = (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => {
    setData(prev => {
      const patch = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...patch };
    });
  };

  const handleNext = () => {
    // ADMIN OVERRIDE: Skip validation if Admin
    if (userRole === 'Admin') {
        if (currentStep < Step.REVIEW) {
            setCurrentStep(prev => prev + 1);
        }
        return;
    }

    if (currentStep === Step.INFO) {
        const anyData = data as any;
        const artists = (anyData.primaryArtists || []).map((a: any) => (typeof a === 'string' ? a : a.name || '').trim()).filter((a: any) => a.length > 0);
        const songwriters = (anyData.songwriters || []).map((s: any) => (typeof s === 'string' ? s : s.name || '').trim()).filter((s: any) => s.length > 0);
        const lyricists = (anyData.lyricists || []).map((l: any) => (typeof l === 'string' ? l : l.name || '').trim()).filter((l: any) => l.length > 0);
        const production = (anyData.productionCredits || []).map((p: any) => (p.name || '').trim()).filter((p: any) => p.length > 0);
        
        let missing: string[] = [];
        if (type === 'SINGLE') {
            if (!anyData.masterUploadId) missing.push("Master Audio File");
            if (!anyData.socialMediaUploadId) missing.push("Social Media Audio");
        } else {
            if (!anyData.tracks || anyData.tracks.length < 2) missing.push("Minimum 2 Tracks for Album");
            const processing = (anyData.tracks || []).some((t: any) => (t.processingAudio === true) || (t.processingClip === true));
            if (processing) {
                setShowAudioProcessingWarning(true);
                return;
            }
        }
        
        if (artists.length === 0) missing.push("Primary Artist");
        if (songwriters.length === 0) missing.push("Songwriter / Composer");
        if (!anyData.isInstrumental && lyricists.length === 0) missing.push("Lyricists");
        if (production.length === 0) missing.push("Production & Additional Production");
        if (!anyData.title || !anyData.title.trim()) missing.push("Release Title");
        if (!anyData.releaseVersion) missing.push("Release Version");
        if (!anyData.genreId) missing.push("Genre");
        if (!anyData.subgenreId) missing.push("Subgenre");

        if (missing.length > 0) {
            setMissingFields(missing);
            setShowMissingWarning(true);
            return;
        }
    }
    
    if (currentStep === Step.DETAILS) {
        let missing: string[] = [];
        if (isProcessingCover) {
             setShowCoverProcessingWarning(true);
             return;
        }

        if (!data.coverArt) missing.push("Cover Art");
        if (!data.plannedReleaseDate) missing.push("Tanggal Rilis");
        
        if (missing.length > 0) {
            setMissingFields(missing);
            setShowMissingWarning(true);
            return;
        }
    }
    
    if (currentStep < Step.REVIEW) {
        setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > Step.INFO) {
        setCurrentStep(prev => prev - 1);
    } else {
        setShowExitModal(true);
    }
  };

  const handleConfirmExit = () => {
      setShowExitModal(false);
      // Disable auto-cleanup on exit to prevent accidental data loss during navigation
      // Users reported files disappearing when navigating back.
      /*
      try {
        const token = '';
        if (token && data.title && (data.primaryArtists || []).length > 0) {
          (async () => {
            try {
              await api.cleanupTmp(token, { title: data.title, primaryArtists: data.primaryArtists });
            } catch (e) {
              console.warn('Failed to cleanup tmp on exit:', (e as any)?.message || e);
            }
          })();
        }
      } catch {}
      */
      onBack();
  };

    const renderStep = () => {
    switch (currentStep) {
        case Step.INFO: 
            return (
                <div className="space-y-6">
                    <Step1ReleaseInfo data={data} updateData={updateData} />
                    {type === 'ALBUM' && (
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Album Tracks</h3>
                            <Step2TrackInfo data={data} updateData={updateData} releaseType={type} userRole={userRole} />
                        </div>
                    )}
                </div>
            );
        case Step.DETAILS: 
            return (
                <div className="space-y-6">
                    {/* Placeholder for Cover Art Uploader */}
                    <div className="bg-white border border-gray-200 rounded p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Cover Art</h3>
                        <p className="text-sm text-slate-600 mb-4">Silakan upload Cover Art (JPG/PNG, minimal 3000x3000px).</p>
                        <input 
                            type="file" 
                            accept="image/jpeg, image/png"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    updateData({ coverArt: e.target.files[0] });
                                }
                            }}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {data.coverArt && (
                            <div className="mt-4">
                                <img 
                                    src={data.coverArt instanceof File ? URL.createObjectURL(data.coverArt) : (typeof data.coverArt === 'string' ? data.coverArt : '')} 
                                    alt="Cover Preview" 
                                    className="w-32 h-32 object-cover rounded shadow"
                                />
                            </div>
                        )}
                    </div>
                    <Step3ReleaseDetail data={data} updateData={updateData} releaseType={type} userRole={userRole} />
                </div>
            );
        case Step.REVIEW: return <Step4Review data={{...data, type}} onSave={onSave} onBack={handlePrev} userRole={userRole} userType={userType} />;
        default: return null;
    }
  };

  const title = initialData ? 'Release Details' : (type === 'SINGLE' ? 'New Single' : 'New Album');

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto pt-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-center space-x-2 text-[10px] text-slate-600 mb-0.5">
                    <span className="font-semibold text-blue-600">Dashboard</span>
                    <span>/</span>
                    <span>{initialData ? 'View' : 'Upload'}</span>
                </div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h1>
            </div>
        </div>

        {/* Stepper */}
        <StepIndicator currentStep={currentStep} onStepClick={(s) => { if (s <= currentStep) setCurrentStep(s); }} />

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl shadow-blue-900/5 border border-gray-200 p-4 mb-6 relative">
            {renderStep()}
        </div>

        {/* Bottom Navigation */}
        {currentStep < Step.REVIEW && (
        <div className="flex justify-between items-center px-1">
            <button 
                onClick={handlePrev}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm hover:shadow-lg hover:shadow-orange-400/30 transform hover:-translate-y-0.5 transition-all"
            >
                <ChevronLeft size={20} />
                Back
            </button>
            
            <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
            >
                Next Step
                <ChevronRight size={20} />
            </button>
        </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-yellow-50 p-3 border-b border-yellow-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-yellow-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-yellow-800">Warning</h3>
                        <p className="text-xs text-yellow-700">Confirmation Required</p>
                    </div>
                    <button 
                        onClick={() => setShowExitModal(false)}
                        className="text-yellow-400 hover:text-yellow-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-5">
                    <p className="text-slate-700 mb-3 font-medium text-sm">
                        Do you want to return to the selection page?
                    </p>
                    <p className="text-sm text-slate-500 mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        If Yes, the draft data you have filled in will be deleted.
                    </p>
                    
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setShowExitModal(false)}
                            className="px-4 py-2 rounded-md font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-sm"
                        >
                            No
                        </button>
                        <button
                            onClick={handleConfirmExit}
                            className="px-4 py-2 rounded-md font-semibold bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-500/30 transition-all text-sm"
                        >
                            Yes
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showCoverProcessingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Loader2 className="text-blue-600 animate-spin" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-blue-800">Upload in Progress</h3>
                        <p className="text-xs text-blue-700">Cover Art is currently uploading. Please wait a moment.</p>
                    </div>
                    <button 
                        onClick={() => setShowCoverProcessingWarning(false)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowCoverProcessingWarning(false)}
                            className="px-4 py-2 rounded-md font-semibold bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all text-sm"
                        >
                            Okay, I'll wait
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showMissingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800">Incomplete Form Data</h3>
                        <p className="text-xs text-red-700">Please complete the following fields before continuing.</p>
                    </div>
                    <button 
                        onClick={() => setShowMissingWarning(false)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-5">
                    <ul className="list-disc pl-5 mb-5 space-y-1 text-slate-700 text-sm">
                        {missingFields.map((field, idx) => (
                            <li key={idx}><strong>{field}</strong> is required</li>
                        ))}
                    </ul>
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowMissingWarning(false)}
                            className="px-4 py-2 rounded-md font-semibold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-sm"
                        >
                            Understand
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showAudioProcessingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800">Process Incomplete</h3>
                        <p className="text-xs text-red-700">Audio is still processing/uploading. Please wait until it completes before proceeding.</p>
                    </div>
                    <button 
                        onClick={() => setShowAudioProcessingWarning(false)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowAudioProcessingWarning(false)}
                            className="px-4 py-2 rounded-md font-semibold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-sm"
                        >
                            Understand
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
