
import React, { useState, useEffect, useMemo } from 'react';
import { ReleaseType, ReleaseData, Step } from '@/types';
import { StepIndicator } from '../components/StepIndicator';
import { Step1ReleaseInfo } from './wizard/Step1ReleaseInfo';
import { Step2TrackInfo } from './wizard/Step2TrackInfo';
import { Step3ReleaseDetail } from './wizard/Step3ReleaseDetail';
import { Step4Review } from './wizard/Step4Review';
import { ChevronLeft, ChevronRight, AlertTriangle, X, Loader2, Plus } from 'lucide-react';
import { api } from '@/utils/api';

type MissingFieldItem = {
    label: string;
    targetId?: string;
    trackId?: string;
};

interface Props {
    type: ReleaseType;
    onBack: () => void;
    onSave: (data: ReleaseData) => void; // New prop to bubble up data
    initialData?: ReleaseData | null; // For viewing/editing
    userRole?: string;
    token?: string;
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
    plannedReleaseDate: "",
    distributionTargets: [
        { id: 'SOCIAL', label: 'Social Media', logo: '' },
        { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: '' },
        { id: 'ALL_DSP', label: 'All DSP', logo: '' },
    ],
};

export const ReleaseWizard: React.FC<Props> = ({ type, onBack, onSave, initialData, userRole, token }) => {
    const [currentStep, setCurrentStep] = useState<number>(Step.INFO);
    const [showExitModal, setShowExitModal] = useState(false);
    const [missingFields, setMissingFields] = useState<MissingFieldItem[]>([]);
    const [showMissingWarning, setShowMissingWarning] = useState(false);
    const [showCoverProcessingWarning, setShowCoverProcessingWarning] = useState(false);
    const [isProcessingCover, setIsProcessingCover] = useState(false);
    const [showAudioProcessingWarning, setShowAudioProcessingWarning] = useState(false);
    const [userType, setUserType] = useState<'Company' | 'Personal' | null>(null);

    const [data, setData] = useState<ReleaseData>(() => initialData ? initialData : INITIAL_DATA);

    // Stable object URL for cover art preview — revoked on change to avoid memory leaks
    const coverArtUrl = useMemo(() => {
        if (!data.coverArt) return null;
        if (data.coverArt instanceof File) return URL.createObjectURL(data.coverArt);
        if (typeof data.coverArt === 'string') return data.coverArt;
        return null;
    }, [data.coverArt]);

    // Cleanup the object URL when it changes or component unmounts
    useEffect(() => {
        return () => {
            if (coverArtUrl && coverArtUrl.startsWith('blob:')) {
                URL.revokeObjectURL(coverArtUrl);
            }
        };
    }, [coverArtUrl]);

    // If viewing existing data, we might want to ensure tracks exist
    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }

        // Fetch user type for validation purposes
        const fetchUserType = async () => {
            const reqToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '');
            if (reqToken) {
                try {
                    const profile = await api.getProfile(reqToken);
                    const type = (profile.account_type === 'Company' || profile.account_type === 'COMPANY') ? 'Company' : 'Personal';
                    setUserType(type);
                } catch (error) {
                    console.error("Failed to fetch user profile in Wizard", error);
                }
            }
        };
        fetchUserType();
    }, [initialData, token]);

    const updateData = (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => {
        setData(prev => {
            const patch = typeof updates === 'function' ? updates(prev) : updates;
            return { ...prev, ...patch };
        });
    };

    const toMissingItems = (fields: string[]): MissingFieldItem[] => fields.map(label => ({ label }));

    const hasNamedListValue = (track: any, field: 'songwriters' | 'lyricists', fallback: string) => {
        const list = Array.isArray(track[field]) ? track[field] : [];
        return list.some((item: any) => String(typeof item === 'string' ? item : item?.name || '').trim().length > 0)
            || String(fallback || '').trim().length > 0;
    };

    const hasCompleteProductionCredit = (track: any) => {
        const credits = Array.isArray(track.productionCredits) ? track.productionCredits : [];
        return credits.some((credit: any) => String(credit?.roleName || '').trim() && String(credit?.name || '').trim());
    };

    const validateAlbumTracks = (): MissingFieldItem[] => {
        const missing: MissingFieldItem[] = [];

        if (!data.tracks || data.tracks.length < 2) {
            missing.push({ label: 'Minimum 2 Tracks for Album', targetId: 'album-tracks-section' });
            return missing;
        }

        data.tracks.forEach((track: any, index) => {
            const trackLabel = `Track ${index + 1}`;
            const add = (label: string, section: 'audio' | 'metadata' | 'artists' | 'details' | 'production' | 'distribution') => {
                missing.push({
                    label: `${trackLabel}: ${label}`,
                    trackId: track.id,
                    targetId: `track-${section}-${track.id}`,
                });
            };

            if (!track.audioFile) add('Master Audio File', 'audio');
            if (!track.audioClip) add('Clip Audio / Social Media Audio', 'audio');
            if (!String(track.trackNumber || '').trim()) add('Track Number', 'metadata');
            if (!String(track.title || '').trim()) add('Track Title', 'metadata');

            const artistNames = (track.artists || [])
                .map((artist: any) => String(artist?.name || '').trim())
                .filter(Boolean);
            if (artistNames.length === 0) add('Primary Artist', 'artists');

            if (!track.genreId && !track.genre) add('Genre', 'details');
            if (!track.subgenreId && !track.subGenre) add('Sub Genre', 'details');
            if (!String(track.isInstrumental || '').trim()) add('Instrumental', 'details');

            if (track.isInstrumental !== 'Yes') {
                if (!String(track.explicitLyrics || '').trim()) add('Explicit Lyrics', 'details');
                if (!String(track.lyricsLanguage || data.language || '').trim()) add('Lyrics Language', 'details');
                if (!hasNamedListValue(track, 'lyricists', track.lyricist)) add('Lyricist', 'details');
            }

            if (!hasNamedListValue(track, 'songwriters', track.composer)) add('Composer', 'details');
            if (!hasCompleteProductionCredit(track)) add('Production & Additional Production', 'production');
            if (track.isNewRelease === false && !String(track.isrc || '').trim()) add('ISRC Code', 'distribution');
        });

        return missing;
    };

    const focusMissingField = (item: MissingFieldItem) => {
        if (!item.targetId) return;
        if (item.trackId) {
            window.dispatchEvent(new CustomEvent('focus-track-section', {
                detail: { trackId: item.trackId, targetId: item.targetId }
            }));
            return;
        }
        document.getElementById(item.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            } else if (!data.coverArt) {
                missing.push("Cover Art");
            }

            if (artists.length === 0) missing.push("Primary Artist");
            if (type === 'SINGLE') {
                if (songwriters.length === 0) missing.push("Songwriter / Composer");
                if (!anyData.isInstrumental && lyricists.length === 0) missing.push("Lyricists");
                if (production.length === 0) missing.push("Production & Additional Production");
            }
            if (!anyData.title || !anyData.title.trim()) missing.push("Release Title");
            if (!anyData.releaseVersion) {
                anyData.releaseVersion = "Original";
                updateData({ releaseVersion: "Original" });
            }
            if (!anyData.genreId) missing.push("Genre");
            if (!anyData.subgenreId) missing.push("Subgenre");

            if (missing.length > 0) {
                setMissingFields(toMissingItems(missing));
                setShowMissingWarning(true);
                return;
            }
        }

        if (currentStep === Step.DETAILS) {
            let missing: string[] = [];
            if (type === 'ALBUM') {
                const albumMissing = validateAlbumTracks();
                const processing = (data.tracks || []).some((t: any) => (t.processingAudio === true) || (t.processingClip === true));
                if (processing) {
                    setShowAudioProcessingWarning(true);
                    return;
                }
                if (albumMissing.length > 0) {
                    setMissingFields(albumMissing);
                    setShowMissingWarning(true);
                    return false;
                }
            } else if (isProcessingCover) {
                setShowCoverProcessingWarning(true);
                return;
            }

            if (type === 'SINGLE') {
                if (!data.coverArt) missing.push("Cover Art");
                if (!data.plannedReleaseDate) missing.push("Tanggal Rilis");
            }

            if (missing.length > 0) {
                setMissingFields(toMissingItems(missing));
                setShowMissingWarning(true);
                if (missing.includes("Cover Art")) {
                    setTimeout(() => {
                        document.getElementById('cover-art-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
                return false;
            }
        }

        if (currentStep < Step.REVIEW) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        if (currentStep > Step.INFO) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
          const token = typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '';
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

    const renderCoverArtUploader = () => (
        <div id="cover-art-uploader" className="bg-white border border-gray-200 rounded-lg p-6 scroll-mt-24">
            <h3 className="text-sm font-bold text-slate-900 mb-4 font-sans">Upload Cover Art</h3>

            <div className="flex flex-col md:flex-row gap-6 font-sans">
                <div className="flex flex-col items-center w-full md:w-64">
                    <label className="relative flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-red-400 hover:border-red-500 rounded-lg bg-red-50/10 hover:bg-red-50/20 cursor-pointer overflow-hidden transition-all group shadow-sm">
                        <input
                            type="file"
                            accept=".jpg,.jpeg,image/jpeg"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    updateData({ coverArt: e.target.files[0] });
                                }
                            }}
                            className="hidden"
                        />
                        {coverArtUrl ? (
                            <>
                                <img
                                    src={coverArtUrl}
                                    alt="Cover Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                                    Change Cover Art
                                </div>
                            </>
                        ) : (
                            <Plus className="text-red-500 w-12 h-12 stroke-[1.5] transition-transform group-hover:scale-110" />
                        )}
                    </label>

                    {!coverArtUrl && (
                        <p className="text-xs text-red-500 mt-2 font-medium">Please provide the cover art</p>
                    )}
                </div>

                <div className="flex-1 text-slate-600 text-xs leading-relaxed space-y-4 pt-1">
                    <p className="font-medium text-slate-700">
                        Cover art must be square 1:1 .jpg 3000x3000 px file JPG, JPEG, jpg,jpeg
                    </p>
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">It CANNOT contain</h4>
                        <ul className="space-y-2.5">
                            <li className="flex items-start gap-2.5">
                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">x</span>
                                <span>Any text that is not included in and identical to the release data.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">x</span>
                                <span>Brand Logos, social media logos or handles</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">x</span>
                                <span>Contact information, store name or address, advertisements of any kind, etc.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep = () => {
        switch (currentStep) {
            case Step.INFO:
                return (
                    <div className="space-y-6">
                        <Step1ReleaseInfo
                            data={data}
                            updateData={updateData}
                            releaseType={type}
                            coverArtUploader={type === 'ALBUM' ? renderCoverArtUploader() : null}
                        />
                    </div>
                );
            case Step.DETAILS:
                if (type === 'ALBUM') {
                    return (
                        <div className="space-y-6">
                            <div id="album-tracks-section" className="scroll-mt-24">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Album Tracks</h3>
                                <Step2TrackInfo data={data} updateData={updateData} releaseType={type} userRole={userRole} />
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        {/* Cover Art Uploader */}
                        <div id="cover-art-uploader" className="bg-white border border-gray-200 rounded-lg p-6 scroll-mt-24">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 font-sans">Cover art</h3>

                            <div className="flex flex-col md:flex-row gap-6 font-sans">
                                {/* Left side: Upload card */}
                                <div className="flex flex-col items-center w-full md:w-64">
                                    <label className="relative flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-red-400 hover:border-red-500 rounded-lg bg-red-50/10 hover:bg-red-50/20 cursor-pointer overflow-hidden transition-all group shadow-sm">
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,image/jpeg"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    updateData({ coverArt: e.target.files[0] });
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        {coverArtUrl ? (
                                            <>
                                                <img
                                                    src={coverArtUrl}
                                                    alt="Cover Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                                                    Change Cover Art
                                                </div>
                                            </>
                                        ) : (
                                            <Plus className="text-red-500 w-12 h-12 stroke-[1.5] transition-transform group-hover:scale-110" />
                                        )}
                                    </label>

                                    {!coverArtUrl && (
                                        <p className="text-xs text-red-500 mt-2 font-medium">Please provide the cover art</p>
                                    )}
                                </div>

                                {/* Right side: Instructions */}
                                <div className="flex-1 text-slate-600 text-xs leading-relaxed space-y-4 pt-1">
                                    <p className="font-medium text-slate-700">
                                        Cover art must be square 1:1 .jpg 3000x3000 px file JPG, JPEG, jpg,jpeg
                                    </p>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">It CANNOT contain</h4>
                                        <ul className="space-y-2.5">
                                            <li className="flex items-start gap-2.5">
                                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">✕</span>
                                                <span>Any text that is not included in and identical to the release data.</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">✕</span>
                                                <span>Brand Logos, social media logos or handles</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="text-red-500 font-bold text-xs shrink-0 select-none">✕</span>
                                                <span>Contact information, store name or address, advertisements of any kind, etc.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Step3ReleaseDetail data={data} updateData={updateData} releaseType={type} userRole={userRole} />
                    </div>
                );
            case Step.REVIEW: return <Step4Review data={{ ...data, type }} onSave={onSave} onBack={handlePrev} userRole={userRole} userType={userType} token={token} />;
            default: return null;
        }
    };

    const title = initialData ? 'Release Details' : (type === 'SINGLE' ? 'New Single' : 'New Album');

    return (
        <div className="min-h-screen pb-20">
            <div className="w-full max-w-none pt-6 px-4 md:px-6">
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
                <StepIndicator currentStep={currentStep} releaseType={type} onStepClick={(s) => { if (s <= currentStep) setCurrentStep(s); }} />

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
                            <ul className="mb-5 space-y-2 text-slate-700 text-sm max-h-80 overflow-y-auto pr-1">
                                {missingFields.map((field, idx) => (
                                    <li key={idx}>
                                        <button
                                            type="button"
                                            onClick={() => focusMissingField(field)}
                                            className={`w-full text-left px-3 py-2 rounded-md border transition-colors font-semibold ${
                                                field.targetId
                                                    ? '!border-red-200 !bg-red-50 hover:!bg-red-100 !text-red-900'
                                                    : '!border-slate-200 !bg-slate-50 !text-slate-800 cursor-default'
                                            }`}
                                            style={{
                                                color: field.targetId ? '#7f1d1d' : '#1f2937',
                                                backgroundColor: field.targetId ? '#fef2f2' : '#f8fafc',
                                            }}
                                        >
                                            <strong style={{ color: field.targetId ? '#991b1b' : '#111827' }}>{field.label}</strong>
                                            <span style={{ color: field.targetId ? '#7f1d1d' : '#334155' }}> is required</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        const first = missingFields[0];
                                        setShowMissingWarning(false);
                                        setTimeout(() => first && focusMissingField(first), 100);
                                    }}
                                    className="px-4 py-2 rounded-md font-semibold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-sm"
                                >
                                    Go to First Error
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
