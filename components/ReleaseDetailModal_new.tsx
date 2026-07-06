
import React, { useState, useEffect, useRef } from 'react';
import { ReleaseData, Track } from '@/types';
import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera, ExternalLink, PlayCircle } from 'lucide-react';
import { formatDMY } from '@/utils/date';
import { assetUrl } from '@/utils/url';
import { api, API_BASE_URL } from '@/utils/api';
import { AlertModal } from './AlertModal';

interface Props {
  release: ReleaseData;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRelease: ReleaseData) => void;
  availableAggregators: string[];
  mode?: 'view' | 'edit';
  onEdit?: (release: ReleaseData) => void;
  onDelete?: (release: ReleaseData) => void;
  userRole?: 'Admin' | 'Operator' | 'User' | string;
  isUpdatingCoverArt?: boolean;
  token?: string;
  onCoverArtUpdated?: (newCoverArtUrl: string) => void;
}

const MetaItem = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-center">
    <div className="flex items-center gap-1.5 text-slate-400 mb-1.5 uppercase tracking-wider">
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </div>
    <div className="text-sm font-bold text-slate-800 line-clamp-2">{value || "-"}</div>
  </div>
);

export const ReleaseDetailModal: React.FC<Props> = ({ release, isOpen, onClose, onUpdate, availableAggregators, mode = 'edit', onEdit, onDelete, userRole, isUpdatingCoverArt, token, onCoverArtUpdated }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'DISTRIBUTION'>('INFO');
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  // Accordion State for Tracklist
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Audio Preview State
  // Keys: `${trackId}_full` or `${trackId}_clip`
  const [objectUrls, setObjectUrls] = useState<{ [key: string]: string }>({});
  
  // File Input Ref for Cover Art
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);


  // Form State for Distribution
  const [status, setStatus] = useState(release.status || 'Pending');
  const [selectedAggregator, setSelectedAggregator] = useState(release.aggregator || '');
  const [upcInput, setUpcInput] = useState(release.upc || '');
  const [isrcInputs, setIsrcInputs] = useState<{ [key: string]: string }>({});

  // Rejection State
  const [rejectionReason, setRejectionReason] = useState(release.rejectionReason || '');
  const [rejectionDesc, setRejectionDesc] = useState(release.rejectionDescription || '');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const resolvedGenreName = release.genre || "";
  const resolvedSubGenreName = (release as any).subGenre || "";

  const upcDisplay = upcInput || release.upc || '';
  const primaryIsrc = release.tracks[0]?.isrc || '';

  useEffect(() => {
    if (isOpen) {
        // Initialize ISRC inputs from existing tracks
        const initialIsrcs: any = {};
        release.tracks.forEach(t => {
            initialIsrcs[t.id] = t.isrc || '';
        });
        setIsrcInputs(initialIsrcs);
        setStatus(release.status || 'Pending');
        setSelectedAggregator(release.aggregator || '');
        setUpcInput(release.upc || '');
        setRejectionReason(release.rejectionReason || '');
        setRejectionDesc(release.rejectionDescription || '');
        
        // Reset expanded track
        setExpandedTrackId(null);
    }
  }, [isOpen, release]);

  // Generate Object/Asset URLs for preview (Cover, Full Audio, Clip Audio)
  useEffect(() => {
    if (!isOpen) return;
    const newUrls: { [key: string]: string } = {};
    
    // Cover Art
    if (release.coverArt) {
        if (typeof release.coverArt === 'string') {
            newUrls['cover_art'] = assetUrl(release.coverArt);
        } else if (release.coverArt instanceof Blob) {
            newUrls['cover_art'] = URL.createObjectURL(release.coverArt);
        } else {
            // Unsupported type, skip
        }
    }

    // Tracks
    release.tracks.forEach(t => {
        if ((t as any).audioFile) {
            const af: any = (t as any).audioFile;
            if (typeof af === 'string') newUrls[`${t.id}_full`] = assetUrl(af);
            else if (af instanceof Blob) newUrls[`${t.id}_full`] = URL.createObjectURL(af);
        }
        if ((t as any).audioClip) {
            const ac: any = (t as any).audioClip;
            if (typeof ac === 'string') newUrls[`${t.id}_clip`] = assetUrl(ac);
            else if (ac instanceof Blob) newUrls[`${t.id}_clip`] = URL.createObjectURL(ac);
        }
    });
    setObjectUrls(newUrls);

    return () => {
        Object.values(newUrls).forEach(url => {
            // Revoke only blob/object urls
            if (url.startsWith('blob:')) {
                try { URL.revokeObjectURL(url); } catch {}
            }
        });
    };
  }, [isOpen, release.tracks, release.coverArt]);

  if (!isOpen) return null;

  const toggleTrackExpand = (trackId: string) => {
    setExpandedTrackId(prev => prev === trackId ? null : trackId);
  };

  const handleCoverArtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check permissions if needed, but UI already restricts it
    if (!token) {
        setAlertState({
            isOpen: true,
            title: 'Sesi Berakhir',
            message: 'Session expired. Please login again.',
            type: 'error'
        });
        return;
    }

    // 1. Strict File Type Check
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
        setAlertState({
            isOpen: true,
            title: 'Format File Salah',
            message: 'Format gambar WAJIB JPG/JPEG. Tidak boleh format lain.',
            type: 'error'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    // 2. Strict Dimension Check (3000x3000px)
    const isValidDimensions = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            if (img.width !== 3000 || img.height !== 3000) {
                setAlertState({
                    isOpen: true,
                    title: 'Ukuran Gambar Salah',
                    message: `Ukuran gambar WAJIB 3000x3000px. Tidak boleh ukuran lain. Ukuran file anda: ${img.width}x${img.height}px`,
                    type: 'error'
                });
                resolve(false);
            } else {
                resolve(true);
            }
        };
        img.onerror = () => {
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Gagal membaca file gambar.',
                type: 'error'
            });
            resolve(false);
        };
    });

    if (!isValidDimensions) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setAlertState({
            isOpen: true,
            title: 'File Terlalu Besar',
            message: 'File size exceeds 5MB limit.',
            type: 'error'
        });
        return;
    }

    setIsUploadingCover(true);
    try {
        const formData = new FormData();
        formData.append('cover_art', file);

        const response = await fetch(`${API_BASE_URL}/releases/${release.id}/cover-art`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(err.message || 'Failed to upload cover art');
        }

        const data = await response.json();
        
        if (data.coverArt) {
           const newUrl = assetUrl(data.coverArt);
           // Update local preview immediately
           setObjectUrls(prev => ({ ...prev, 'cover_art': newUrl }));
           
           if (onCoverArtUpdated) {
               onCoverArtUpdated(data.coverArt);
           }
           setAlertState({
               isOpen: true,
               title: 'Berhasil',
               message: 'Cover art updated successfully!',
               type: 'success'
           });
        } else {
           setAlertState({
               isOpen: true,
               title: 'Berhasil',
               message: 'Cover art uploaded. Please refresh to see changes.',
               type: 'success'
           });
        }
        
    } catch (error: any) {
        console.error("Upload error:", error);
        setAlertState({
            isOpen: true,
            title: 'Gagal Upload',
            message: error.message || "Failed to upload cover art",
            type: 'error'
        });
    } finally {
        setIsUploadingCover(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const buildRejectionDescription = (reason: string) => {
      const cleanReason = reason.trim();
      return [
          `Rilis Anda belum dapat kami setujui karena terdapat kendala pada aspek berikut: ${cleanReason}.`,
          '',
          'Mohon lakukan pengecekan ulang terhadap materi rilis dan pastikan seluruh data, audio, artwork, serta metadata sudah sesuai dengan ketentuan distribusi digital.',
          '',
          'Setelah perbaikan selesai, silakan ajukan ulang rilis tersebut agar dapat kami review kembali. Pastikan informasi yang diperbarui sudah lengkap dan konsisten untuk menghindari penolakan ulang.'
      ].join('\n');
  };

  // Generate rejection message without calling client-side API keys.
  const generateRejectionMessage = async () => {
      if (!rejectionReason) {
          setAlertState({
              isOpen: true,
              title: 'Peringatan',
              message: 'Mohon isi alasan utama terlebih dahulu.',
              type: 'warning'
          });
          return;
      }
      setIsGeneratingAi(true);
      setRejectionDesc(buildRejectionDescription(rejectionReason));
      setIsGeneratingAi(false);
  };

  const handleSaveStatus = () => {
      // 1. Validation for Processing
      if (status === 'Processing' && !selectedAggregator) {
          setAlertState({
              isOpen: true,
              title: 'Validasi Gagal',
              message: 'Please select an Aggregator for processing.',
              type: 'error'
          });
          return;
      }

      // 2. Validation for LIVE/RELEASED (Strict)
      if (status === 'Live') {
          if (!upcInput || upcInput.trim() === "") {
             setAlertState({
                 isOpen: true,
                 title: 'CRITICAL ERROR',
                 message: 'Album UPC is REQUIRED for Released status.',
                 type: 'error'
             });
             return;
          }
          
          const missingIsrcs = release.tracks.some(t => {
              const val = isrcInputs[t.id];
              return !val || val.trim() === "";
          });

          if (missingIsrcs) {
              setAlertState({
                  isOpen: true,
                  title: 'CRITICAL ERROR',
                  message: 'ISRC Codes are REQUIRED for ALL tracks when status is Released.',
                  type: 'error'
              });
              return;
          }
      }

      // 3. Validation for Rejection
      if (status === 'Rejected' && !rejectionReason) {
          setAlertState({
              isOpen: true,
              title: 'Validasi Gagal',
              message: 'Please provide a reason for rejection.',
              type: 'error'
          });
          return;
      }

      // Construct Updated Release
      const updatedTracks = release.tracks.map(t => ({
          ...t,
          isrc: isrcInputs[t.id] || t.isrc
      }));

      const updatedRelease: ReleaseData = {
          ...release,
          status: status,
          aggregator: selectedAggregator,
          upc: upcInput,
          rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
          rejectionDescription: status === 'Rejected' ? rejectionDesc : undefined,
          tracks: updatedTracks
      };

      onUpdate(updatedRelease);
  };

  const downloadFile = (url: string, filename: string) => {
      // If it's a local file (starts with /uploads/ or contains it), use our download proxy
      if (url.includes('/uploads/')) {
          const relativePath = url.split('/uploads/')[1];
          const downloadUrl = `${API_BASE_URL}/releases/download?filePath=/uploads/${relativePath}&fileName=${encodeURIComponent(filename)}&token=${token}`;
          
          // Since we need authentication, we can either use a token in query or fetch
          // For simplicity with <a> tag, we'll use query param if the server supports it, 
          // but our middleware uses Bearer token.
          // Let's use a hidden form or a fetch-based download.
          
          fetch(downloadUrl, {
              headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => {
              if (!res.ok) throw new Error('Download failed');
              return res.blob();
          })
          .then(blob => {
              const bUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = bUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(bUrl);
          })
          .catch(err => {
              console.error(err);
              // Fallback to direct link if fetch fails
              window.open(url, '_blank');
          });
          return;
      }

      // Fallback for non-local (like old Google Drive links)
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const getFileName = (f: any, fallback = ''): string => {
      if (!f) return fallback;
      if (typeof f === 'string') {
          const parts = f.split(/[\\/]/);
          return parts[parts.length - 1] || fallback;
      }
      return f.name || fallback;
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setAlertState({
          isOpen: true,
          title: 'Disalin',
          message: 'Copied to clipboard!',
          type: 'success'
      });
  };

  const AudioPlayer = ({ track, type = 'full' }: { track: Track, type?: 'full' | 'clip' }) => {
    const key = `${track.id}_${type}`;
    const url = objectUrls[key];
    
    if (!url) return <span className="text-xs text-gray-400 italic">No Audio</span>;

    const fileName = type === 'full' ? getFileName((track as any).audioFile, 'full_audio') : getFileName((track as any).audioClip, 'audio_clip');

    return (
      <div className="flex items-center gap-3 w-full">
        <audio
          id={`audio-${key}`}
          src={url}
          controls
          preload="metadata"
          className="flex-1 h-8"
        />
        <button 
          onClick={(e) => { e.stopPropagation(); downloadFile(url, fileName || `audio_${type}.wav`); }}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-blue-600 transition-colors"
          title={`Download ${type === 'full' ? 'Full Track' : 'Clip'}`}
        >
          <Download size={14} />
        </button>
      </div>
    );
  };

  const InfoRow = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
      <div className="flex flex-col mb-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider mb-0.5">{label}</span>
          <div className={`text-[13px] font-medium flex items-center justify-between group ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
              <span className="truncate pr-2">{value || "-"}</span>
              {value && (
                  <button 
                    onClick={() => navigator.clipboard.writeText(value)}
                    className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity"
                    title="Copy"
                  >
                      <Clipboard size={12} />
                  </button>
              )}
          </div>
      </div>
  );

  return (
    <div className="w-full min-h-screen bg-white pb-12 animate-fade-in">
        
        {/* Header - No longer a modal header */}
        <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                    {(userRole === 'Admin' || userRole === 'Operator') && (
                        <div className="flex gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">
                                Discard
                            </button>
                            <button 
                                onClick={handleSaveStatus}
                                className={`px-5 py-2 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all text-sm
                                    ${status === 'Rejected' 
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-100' 
                                        : 'bg-blue-500 hover:bg-blue-600 shadow-blue-100'}
                                `}
                            >
                                <Save size={16} />
                                {status === 'Rejected' ? 'Save Rejection' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                        <div className="mb-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        (status === 'Live' || status === 'Released') ? 'bg-green-100 text-green-700 border-green-200' :
                        status === 'Processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>
                        {status === 'Rejected' && <AlertTriangle size={14} />}
                        <span className="uppercase tracking-wider">{(status === 'Live' || status === 'Released') ? 'Released' : status}</span>
                    </span>
                    {(userRole === 'Admin' || userRole === 'Operator') && release.aggregator && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                            <Globe size={14} /> {release.aggregator}
                        </span>
                    )}
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-slate-600 border border-gray-200 flex items-center gap-1.5">
                        <Music2 size={14} /> {release.tracks.length > 1 ? 'Album' : 'Single'}
                    </span>
                </div>

                {/* REJECTION REASON DISPLAY */}
                {status === 'Rejected' && (rejectionReason || rejectionDesc) && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 text-red-700 font-extrabold text-base mb-3">
                            <AlertTriangle size={22} className="text-red-600" />
                            RILIS DITOLAK (REJECTION REASON)
                        </div>
                        <div className="bg-white/60 rounded-xl p-4 border border-red-100">
                            {rejectionReason && (
                                <div className="mb-3">
                                    <span className="text-[10px] uppercase font-bold text-red-500 tracking-widest block mb-1">Alasan Utama:</span>
                                    <p className="text-sm font-bold text-red-900 leading-tight">{rejectionReason}</p>
                                </div>
                            )}
                            {rejectionDesc && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest block mb-1">Keterangan Detail:</span>
                                    <p className="text-[13px] text-red-800 whitespace-pre-line leading-relaxed font-medium">
                                        {rejectionDesc}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {userRole === 'Admin' && onEdit && (
                        <button
                            onClick={() => onEdit(release)}
                            disabled={!!isUpdatingCoverArt}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Edit Release"
                        >
                            <Edit3 size={14} />
                            Edit Release
                        </button>
                    )}
                    
                    {userRole === 'Admin' && onDelete && (
                        <button
                            onClick={() => onDelete(release)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                            title="Delete Release"
                        >
                            <Trash2 size={14} />
                            Delete Release
                        </button>
                    )}
                </div>
            </div>
{/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button 
                    onClick={() => setActiveTab('INFO')}
                    className={`pb-4 px-4 mr-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'INFO' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <FileText size={16} /> Metadata & Tracks
                </button>
                {(userRole === 'Admin' || userRole === 'Operator') && (
                    <button 
                        onClick={() => setActiveTab('DISTRIBUTION')}
                        className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DISTRIBUTION' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Globe size={16} /> Distribution & Status
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'INFO' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* SECTION 1: RELEASE METADATA SUMMARY */}
      <div className="mb-6 animate-fade-in-up pt-2">
        <div className="border border-gray-200 rounded-lg p-6 relative mt-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-3 bg-white px-2 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Release Information
          </h3>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover Art */}
            <div className="w-full md:w-40 flex-shrink-0">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 shadow-sm">
                {release.coverArt ? (
                  <div className="relative group w-full h-full">
                    <img
                      src={
                        typeof release.coverArt === 'string'
                          ? assetUrl(release.coverArt)
                          : (release.coverArt instanceof Blob ? URL.createObjectURL(release.coverArt) : '/assets/placeholder-cover.jpg')
                      }
                      alt="Cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg';
                        (e.target as HTMLImageElement).onerror = null;
                      }}
                    />
                    {typeof release.coverArt === 'string' && release.coverArt.startsWith('http') && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={release.coverArt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 transition-all transform hover:scale-110"
                          title="Download Cover Art"
                        >
                          <Download size={24} />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Disc size={40} className="mb-2" />
                    <span className="text-xs">No Cover</span>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                  {release.tracks.length > 1 ? 'Album / EP' : 'Single'}
                </span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
              <MetaItem label="Release Title" value={release.title} icon={<FileText size={10} />} />
              <MetaItem
                label="Primary Artist"
                value={
                  <div className="flex flex-col gap-1">
                    {release.primaryArtists.map((a, idx) => {
                      const name = typeof a === 'string' ? a : a.name;
                      const link = typeof a === 'object' && a.spotifyLink ? a.spotifyLink : null;
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span>{name}</span>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-500 hover:text-green-600 inline-flex items-center"
                              title="Spotify Artist Link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                }
                icon={<User size={10} />}
              />
              <MetaItem label="Label" value={release.label} icon={<Users size={10} />} />

              <MetaItem label="Language" value={release.language || (release as any).lyricsLanguage} icon={<Globe size={10} />} />
              <MetaItem label="Genre" value={resolvedGenreName} icon={<Music2 size={10} />} />
              <MetaItem label="Sub Genre" value={resolvedSubGenreName} icon={<Music2 size={10} />} />
              <MetaItem label="Version" value={release.version || release.releaseVersion} icon={<Tag size={10} />} />

              <MetaItem label="Release Date" value={release.plannedReleaseDate || "TBD"} icon={<Calendar size={10} />} />
              <MetaItem label="UPC" value={release.upc || "Auto-Generated"} icon={<FileAudio size={10} />} />
              <MetaItem
                label="Distribution Type"
                value={release.isNewRelease ? "New Release" : `Re-release (Orig: ${release.originalReleaseDate})`}
                icon={<Disc size={10} />}
              />
              {release.pLine && <MetaItem label="P-Line" value={release.pLine} icon={<Tag size={10} />} />}
              {release.cLine && <MetaItem label="C-Line" value={release.cLine} icon={<Tag size={10} />} />}
            </div>
          </div>
        </div>
      </div>

      
                        {/* SECTION 2: DETAILED TRACK METADATA */}
      <div className="mb-6 animate-fade-in-up pt-2" style={{ animationDelay: '0.1s' }}>
        <div className="border border-gray-200 rounded-lg p-6 relative mt-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-3 bg-white px-2 flex items-center gap-2">
            <Music2 size={20} className="text-blue-500" />
            Track Metadata Details
          </h3>

          {/* SINGLE: comprehensive card layout */}
          {release.type === 'SINGLE' && (!release.tracks || release.tracks.length === 0) ? (() => {
            const d = release as any;
            const featuredArtists: any[] = d.featuredArtists || [];
            const songwriters: any[] = d.songwriters || [];
            const lyricists: any[] = d.lyricists || [];
            const additionalWriters: any[] = d.additionalWriters || [];
            const productionCredits: any[] = d.productionCredits || [];
            const contributors: any[] = d.contributors || [];
            const explicit = d.explicitType || 'NO';
            const hasMaster = !!d.masterUploadId;
            const hasSocialClip = !!d.socialMediaUploadId;
            const isInstrumental = !!d.isInstrumental;

            const renderList = (arr: any[], nameKey = 'name', roleKey?: string) =>
              arr.length === 0 ? <span className="text-slate-400">-</span> :
                <div className="flex flex-col gap-0.5">
                  {arr.map((item: any, i: number) => (
                    <span key={i} className="text-slate-700">
                      {typeof item === 'string' ? item : item[nameKey] || '-'}
                      {roleKey && item[roleKey] ? <span className="text-slate-400 ml-1">({item[roleKey]})</span> : null}
                    </span>
                  ))}
                </div>;

            return (
              <div className="space-y-4">
                {/* A: Audio Files */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">A. Audio Files</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <FileAudio size={16} className={hasMaster ? 'text-green-500' : 'text-orange-400'} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Master Audio</p>
                        <p className={`text-xs font-medium ${hasMaster ? 'text-green-700' : 'text-orange-500'}`}>
                          {hasMaster ? `Uploaded ✓` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlayCircle size={16} className={hasSocialClip ? 'text-green-500' : 'text-orange-400'} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Social Media Clip (30-60s)</p>
                        <p className={`text-xs font-medium ${hasSocialClip ? 'text-green-700' : 'text-orange-500'}`}>
                          {hasSocialClip ? `Uploaded ✓` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* B: Track Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">B. Track Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Genre</p>
                      <p className="text-xs font-bold text-slate-800">{resolvedGenreName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sub Genre</p>
                      <p className="text-xs font-bold text-slate-800">{resolvedSubGenreName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Explicit Content</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium border inline-block ${explicit === 'YES' ? 'bg-red-50 text-red-600 border-red-100' :
                          explicit === 'CLEAN' ? 'bg-green-50 text-green-600 border-green-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {explicit === 'YES' ? 'Explicit' : explicit === 'CLEAN' ? 'Clean' : 'No'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Instrumental</p>
                      <p className="text-xs font-bold text-slate-800">{isInstrumental ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  {release.isrc && (
                    <div className="mt-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">ISRC</p>
                      <p className="text-xs font-mono text-slate-700">{release.isrc}</p>
                    </div>
                  )}
                </div>

                {/* C: Artists */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">C. Artists</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Primary Artists</p>
                      {renderList(release.primaryArtists)}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Featured Artists</p>
                      {renderList(featuredArtists)}
                    </div>
                  </div>
                </div>

                {/* D: Writers */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">D. Writers</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Songwriters / Composers</p>
                      {renderList(songwriters)}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyricists</p>
                      {renderList(lyricists)}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Additional Writers</p>
                      {renderList(additionalWriters, 'name', 'role')}
                    </div>
                  </div>
                </div>

                {/* E: Lyrics Info */}
                {!isInstrumental && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">E. Lyrics Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics Language</p>
                        <p className="text-xs font-bold text-slate-800">{d.lyricsLanguage || release.language || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics</p>
                        <p className="text-xs text-slate-700">{d.lyrics ? `${d.lyrics.substring(0, 60)}${d.lyrics.length > 60 ? '…' : ''}` : '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* F: Credits */}
                {(productionCredits.length > 0 || contributors.length > 0) && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">F. Credits</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Production Credits</p>
                        {renderList(productionCredits, 'name', 'role')}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Contributors</p>
                        {renderList(contributors, 'name', 'role')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })() : (
            
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
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${track.explicitLyrics === 'Yes' ? 'bg-red-100 text-red-700' : track.explicitLyrics === 'Clean' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
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
                        <div className="text-xs text-slate-600 truncate" title={`C: ${track.composer} | L: ${track.lyricist}`}>
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
            </div>
          )}
        </div>
      </div>
                    </div>
                )}
                {/* TAB 2: DISTRIBUTION ADMIN */}
                {userRole === 'Admin' && activeTab === 'DISTRIBUTION' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm mb-8 animate-fade-in-up">
                            <h3 className="font-bold text-xl text-slate-800 mb-2">Workflow Management</h3>
                            <p className="text-sm text-slate-500 mb-8 pb-4 border-b border-gray-100">Update the status of this release to move it through the pipeline.</p>
                            
                            <div className="space-y-8">
                                {/* Status Selector */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">Release Status</label>
                                    <select 
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 font-bold text-black
                                            ${status === 'Rejected' ? 'border-red-200 bg-red-50 focus:border-red-500 focus:ring-red-100' : 
                                            status === 'Live' ? 'border-green-200 bg-green-50 focus:border-green-500 focus:ring-green-100' :
                                            'border-blue-200 bg-white focus:border-blue-500 focus:ring-blue-100'}
                                        `}
                                    >
                                        <option value="Pending" className="text-black">Pending Review</option>
                                        <option value="Request Edit" className="text-black">Request Edit</option>
                                        <option value="Processing" className="text-black">Processing (Aggregator)</option>
                                        <option value="Live" className="text-black">Released</option>
                                        <option value="Rejected" className="text-black">Rejected</option>
                                    </select>
                                </div>

                                {/* --- REJECTION WORKFLOW --- */}
                                {status === 'Rejected' && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 animate-fade-in-down">
                                        <h4 className="font-bold text-red-800 flex items-center gap-2 mb-4 text-lg">
                                            <AlertTriangle size={20} /> Rejection Details
                                        </h4>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Main Reason</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="e.g. Cover Art tidak sesuai guideline"
                                                        className="flex-1 px-4 py-3 border border-red-200 rounded-lg focus:outline-none focus:border-red-500 text-sm text-black font-semibold"
                                                    />
                                                    <button 
                                                        onClick={generateRejectionMessage}
                                                        disabled={isGeneratingAi || !rejectionReason.trim()}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 min-w-[80px] justify-center"
                                                        title="Generate Detailed Description with AI"
                                                    >
                                                        {isGeneratingAi ? <Loader2 size={16} className="animate-spin"/> : "OK"}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-red-500 mt-1.5 font-medium">Klik OK untuk membuat deskripsi detail otomatis menggunakan AI.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1 flex justify-between">
                                                    <span>Detailed Description (Email to User)</span>
                                                </label>
                                                <textarea 
                                                    value={rejectionDesc}
                                                    onChange={(e) => setRejectionDesc(e.target.value)}
                                                    placeholder="Deskripsi detail akan muncul di sini setelah klik OK..."
                                                    rows={6}
                                                    className="w-full px-4 py-3 border border-red-200 rounded-lg focus:outline-none focus:border-red-500 text-sm resize-none bg-white shadow-sm text-black font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- PROCESSING WORKFLOW --- */}
                                {(status === 'Processing' || status === 'Live') && (
                                    <div className="animate-fade-in-down">
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <Globe size={16} className="text-purple-500" />
                                            Select Aggregator
                                        </label>
                                        <select 
                                            value={selectedAggregator}
                                            onChange={(e) => setSelectedAggregator(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-purple-500 shadow-sm text-black font-semibold"
                                        >
                                            <option value="" className="text-black">-- Choose Aggregator --</option>
                                            {availableAggregators.map(agg => (
                                                <option key={agg} value={agg} className="text-black">{agg}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* --- LIVE WORKFLOW (CODES) --- */}
                                {status === 'Live' && (
                                    <div className="animate-fade-in-down bg-green-50 p-6 rounded-xl border border-green-100 space-y-6">
                                        <div className="flex items-center gap-2 border-b border-green-200 pb-3">
                                            <CheckCircle size={20} className="text-green-600" />
                                            <span className="font-bold text-green-800 text-lg">Mandatory Release Codes</span>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-1">
                                                Album UPC <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                value={upcInput}
                                                onChange={(e) => setUpcInput(e.target.value)}
                                                placeholder="Enter UPC Code (Required)"
                                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm shadow-sm text-black font-bold
                                                    ${!upcInput ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-white' : 'border-green-200 focus:ring-green-500'}`}
                                            />
                                            {!upcInput && <p className="text-[10px] text-red-500 mt-1 font-bold">UPC is required to set status to Released.</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-3">
                                                Track ISRCs <span className="text-red-500">*</span>
                                            </label>
                                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                                {release.tracks.map(track => {
                                                    const hasVal = isrcInputs[track.id] && isrcInputs[track.id].trim() !== "";
                                                    return (
                                                        <div key={track.id} className="flex items-center gap-3 bg-white p-2 rounded border border-green-100">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs">{track.trackNumber}</div>
                                                            <span className="text-sm text-black w-1/3 truncate font-bold" title={track.title}>{track.title}</span>
                                                            <input 
                                                                value={isrcInputs[track.id] || ''}
                                                                onChange={(e) => setIsrcInputs(prev => ({...prev, [track.id]: e.target.value}))}
                                                                placeholder="ISRC (Required)"
                                                                className={`flex-1 px-3 py-2 border rounded text-sm font-mono focus:outline-none
                                                                    ${!hasVal ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-green-500'}`}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
