
import React, { useState, useEffect, useRef } from 'react';
import { ReleaseData, Track } from '@/types';
import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp, Edit3, Trash2, Upload, Camera } from 'lucide-react';
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
  hideDistributionTab?: boolean;
}

const audioPreviewUrl = (filePath: string) => {
  if (!filePath.includes('/uploads/')) return assetUrl(filePath);

  const relativePath = `/uploads/${filePath.split('/uploads/')[1]}`;
  const params = new URLSearchParams({
    filePath: relativePath,
    inline: '1',
  });
  return `${API_BASE_URL}/releases/download?${params.toString()}`;
};

export const ReleaseDetailModal: React.FC<Props> = ({ release, isOpen, onClose, onUpdate, availableAggregators, mode = 'edit', onEdit, onDelete, userRole, isUpdatingCoverArt, token, onCoverArtUpdated, hideDistributionTab = false }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'DISTRIBUTION'>('INFO');
  
  const renderList = (arr: any[], nameKey = 'name', roleKey?: string) =>
    (!arr || arr.length === 0) ? <span className="text-slate-400 font-normal italic text-xs">-</span> :
      <div className="flex flex-col gap-1">
        {arr.map((item: any, i: number) => {
          const roleVal = roleKey ? (item[roleKey] || item.role || item.roleName || item.role_name || '') : '';
          return (
            <span key={i} className="text-slate-850 text-sm font-bold">
              {typeof item === 'string' ? item : item[nameKey] || '-'}
              {roleVal ? <span className="text-slate-400 font-medium text-xs ml-1">({roleVal})</span> : null}
            </span>
          );
        })}
      </div>;

  const artistRoleEquals = (artist: any, roles: string[]) => {
    const role = String(artist?.role || artist?.roleName || artist?.role_name || '').toLowerCase();
    return roles.map(r => r.toLowerCase()).includes(role);
  };

  const getTrackArtists = (track: any, roles: string[]) =>
    (track.artists || []).filter((artist: any) => artist?.name && artistRoleEquals(artist, roles));

  const getNamedPeople = (list: any, fallback?: string) => {
    const normalized = Array.isArray(list) ? list.filter(Boolean) : [];
    if (normalized.length > 0) return normalized;
    return fallback ? fallback.split(',').map(name => ({ name: name.trim() })).filter(item => item.name) : [];
  };

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

  const upcDisplay = upcInput || release.upc || '';
  const primaryIsrc = release.tracks[0]?.isrc || '';
  const isAlbumRelease = release.type === 'ALBUM' || release.tracks.length > 1;

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
            if (typeof af === 'string') newUrls[`${t.id}_full`] = audioPreviewUrl(af);
            else if (af instanceof Blob) newUrls[`${t.id}_full`] = URL.createObjectURL(af);
        }
        if ((t as any).audioClip) {
            const ac: any = (t as any).audioClip;
            if (typeof ac === 'string') newUrls[`${t.id}_clip`] = audioPreviewUrl(ac);
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
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(err.message || err.error || 'Failed to upload cover art');
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
      // Helper: trigger download from blob
      const triggerBlobDownload = (blob: Blob, name: string) => {
          const bUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = bUrl;
          a.download = name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(bUrl);
          }, 200);
      };

      // Helper: trigger download via direct anchor (no new tab)
      const triggerAnchorDownload = (href: string, name: string) => {
          const a = document.createElement('a');
          a.href = href;
          a.download = name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { document.body.removeChild(a); }, 200);
      };

      if (url.includes('/uploads/')) {
          const relativePath = url.split('/uploads/')[1];
          const downloadUrl = `${API_BASE_URL}/releases/download?filePath=/uploads/${relativePath}&fileName=${encodeURIComponent(filename)}`;
          
          // Try authenticated fetch first
          fetch(downloadUrl, {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include'
          })
          .then(res => {
              if (!res.ok) throw new Error('Download failed');
              return res.blob();
          })
          .then(blob => {
              triggerBlobDownload(blob, filename);
          })
          .catch(() => {
              // Fallback: try direct static URL download (no new tab)
              triggerAnchorDownload(url, filename);
          });
          return;
      }

      // Fallback for non-local URLs
      triggerAnchorDownload(url, filename);
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
            <div className="w-full max-w-none px-4 md:px-8 py-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} />
                        Kembali ke Daftar
                    </button>
                    {(userRole === 'Admin' || userRole === 'Operator') && !hideDistributionTab && (
                        <div className="flex gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">
                                Batal
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
                                {status === 'Rejected' ? 'Simpan Penolakan' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="w-full max-w-none px-4 md:px-8 py-8">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-3 flex-shrink-0 w-32 md:w-36">
                    <div className="w-full aspect-square rounded-xl bg-gray-200 shadow-md overflow-hidden border border-gray-300 flex flex-col relative group">
                        <div className="flex-1 relative">
                            {release.coverArt ? (
                                <img 
                                    src={objectUrls['cover_art']} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg';
                                        (e.target as HTMLImageElement).onerror = null;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400"><Disc size={40} /></div>
                            )}
                            
                            {/* Edit Overlay */}
                            {(!isUpdatingCoverArt) && (
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${release.coverArt ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingCover}
                                        className="p-3 bg-white/90 backdrop-blur-sm rounded-full text-slate-700 hover:text-blue-600 hover:scale-110 transition-all shadow-lg"
                                        title="Ganti Cover Art"
                                    >
                                        {isUploadingCover ? <Loader2 size={24} className="animate-spin text-blue-600" /> : <Camera size={24} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Hidden Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleCoverArtUpload} 
                        accept=".jpg, .jpeg" 
                        className="hidden" 
                    />

                    {/* Change Cover Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingCover}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isUploadingCover ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        Ganti Art Cover
                    </button>

                    <button 
                        onClick={() => {
                            if (!release.coverArt) return;
                            const name = getFileName(release.coverArt, 'cover_art');
                            downloadFile(objectUrls['cover_art'], name);
                        }}
                        disabled={!release.coverArt}
                        className="w-full py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors
                                   border-orange-400 text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-50"
                    >
                        <Download size={14} /> Cover Album
                    </button>
                    
                    <div className="text-[10px] text-red-600 font-medium leading-tight text-center mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        Wajib menggunakan format JPG/JPEG dengan resolusi tepat 3000x3000px.
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5 mb-1">
                                <span className="text-sm text-slate-600 font-semibold">
                                    {(release as any).ownerDisplayName || 'User Tidak Dikenal'}
                                </span>
                                <div className="h-3.5 w-px bg-slate-300"></div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                                    (status === 'Live' || status === 'Released') ? 'bg-green-100 text-green-700 border-green-200' :
                                    status === 'Processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }`}>
                                    {status === 'Rejected' && <AlertTriangle size={10} />}
                                    {(status === 'Live' || status === 'Released') ? 'Rilis' : status === 'Processing' ? 'Diproses' : status === 'Rejected' ? 'Ditolak' : status === 'Request Edit' ? 'Minta Revisi' : 'Menunggu'}
                                </span>
                                {(userRole === 'Admin' || userRole === 'Operator') && release.aggregator && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                                        <Globe size={10} className="text-purple-600" /> {release.aggregator}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-slate-600 border border-gray-200 flex items-center gap-1">
                                    <Music2 size={10} className="text-slate-500" /> {release.tracks.length > 1 ? 'Album' : 'Single'}
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">{release.title}</h1>
                            <p className="text-slate-600 font-medium text-lg mb-3">
                                {release.primaryArtists.map(a => typeof a === 'string' ? a : a.name).join(", ")}
                            </p>
                        </div>
                        
                        {/* Edit and Delete Buttons */}
                        <div className="flex items-center gap-2">
                            {userRole === 'Admin' && onEdit && (
                                <button
                                    onClick={() => onEdit(release)}
                                    disabled={!!isUpdatingCoverArt}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Edit Rilis"
                                >
                                    <Edit3 size={14} />
                                    Edit Rilis
                                </button>
                            )}
                            {userRole === 'Admin' && onDelete && (
                                <button
                                    onClick={() => onDelete(release)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                                    title="Hapus Rilis"
                                >
                                    <Trash2 size={14} />
                                    Hapus Rilis
                                </button>
                            )}
                        </div>
                    </div>

                    {/* REJECTION REASON DISPLAY */}
                    {status === 'Rejected' && (rejectionReason || rejectionDesc) && (
                        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-6 animate-fade-in-down shadow-sm">
                            <div className="flex items-center gap-2.5 text-red-700 font-extrabold text-base mb-3">
                                <AlertTriangle size={22} className="text-red-600" />
                                RILIS DITOLAK
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

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <MetaItem label="Judul Rilis" value={release.title} icon={<FileText size={10} />} />
                        <MetaItem
                            label="Artis Utama / Featuring"
                            value={
                                <div className="flex flex-col gap-1">
                                    {(release.primaryArtists || []).map((a, idx) => {
                                        const name = typeof a === 'string' ? a : a.name;
                                        const link = typeof a === 'object' && (a as any).spotifyLink ? (a as any).spotifyLink : null;
                                        const roleVal = typeof a === 'object' && (a as any).role ? (a as any).role : 'MainArtist';
                                        const isFeat = roleVal.toLowerCase() === 'featured' || roleVal.toLowerCase() === 'featuredartist' || roleVal.toLowerCase() === 'featured artist';
                                        return (
                                            <div key={`prim-${idx}`} className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-semibold text-slate-800">{name}</span>
                                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                                                    isFeat 
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                    : 'bg-violet-50 text-violet-750 border-violet-200'
                                                }`}>
                                                    {isFeat ? 'Featuring' : 'Artis Utama'}
                                                </span>
                                                {link && (
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-500 hover:text-green-600 inline-flex items-center"
                                                        title="Link Spotify Artis"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Globe size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {((release as any).featuredArtists || []).map((a: any, idx: number) => {
                                        const name = typeof a === 'string' ? a : a.name;
                                        const link = typeof a === 'object' && (a as any).spotifyLink ? (a as any).spotifyLink : null;
                                        return (
                                            <div key={`feat-${idx}`} className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-semibold text-slate-800">{name}</span>
                                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-bold">
                                                    Featuring
                                                </span>
                                                {link && (
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-500 hover:text-green-600 inline-flex items-center"
                                                        title="Link Spotify Artis"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Globe size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                            icon={<User size={10} />}
                        />
                        <MetaItem label="Versi" value={release.version} icon={<Tag size={10} />} />

                        <MetaItem label="Genre" value={release.genre || release.tracks[0]?.genre} icon={<Music2 size={10} />} />
                        <MetaItem label="Subgenre" value={release.subGenre || release.tracks[0]?.subGenre} icon={<Music2 size={10} />} />
                        <MetaItem label="Bahasa" value={release.language} icon={<Globe size={10} />} />

                        <MetaItem label="UPC" value={upcDisplay || "Otomatis"} icon={<FileAudio size={10} />} />
                        {!isAlbumRelease && (
                            <MetaItem label="ISRC" value={isrcInputs[release.tracks[0]?.id] || primaryIsrc || "Otomatis"} icon={<FileAudio size={10} />} />
                        )}
                        <MetaItem label="Label Rekaman" value={release.label} icon={<Users size={10} />} />
                        <MetaItem label="Tanggal Rilis" value={formatDMY(release.plannedReleaseDate) || "Belum Ditentukan"} icon={<Calendar size={10} />} />

                        <MetaItem label="Tanggal Rilis Asli" value={formatDMY(release.originalReleaseDate) || "-"} icon={<Calendar size={10} />} />
                        
                        {((release as any).preReleaseSocialMedia || (release as any).pre_release_social_media) && (
                            <MetaItem label="Pra-Rilis Media Sosial" value={formatDMY((release as any).preReleaseSocialMedia || (release as any).pre_release_social_media)} icon={<Calendar size={10} />} />
                        )}
                        {((release as any).preReleaseYoutubeMusic || (release as any).pre_release_youtube_music) && (
                            <MetaItem label="Pra-Rilis YouTube Music" value={formatDMY((release as any).preReleaseYoutubeMusic || (release as any).pre_release_youtube_music)} icon={<Calendar size={10} />} />
                        )}

                        <MetaItem
                            label="Tipe Distribusi"
                            value={release.isNewRelease ? "Rilis Baru" : `Rilis Ulang (Asli: ${formatDMY(release.originalReleaseDate)})`}
                            icon={<Disc size={10} />}
                        />

                    </div>

                </div>
            </div>

            {/* Navigation Tabs */}
            {!hideDistributionTab && (
                <div className="flex border-b border-gray-200 mb-8">
                    <button 
                        onClick={() => setActiveTab('INFO')}
                        className={`pb-4 px-4 mr-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'INFO' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <FileText size={16} /> Metadata & Track
                    </button>
                    {(userRole === 'Admin' || userRole === 'Operator') && (
                        <button 
                            onClick={() => setActiveTab('DISTRIBUTION')}
                            className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DISTRIBUTION' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Globe size={16} /> Distribusi & Status
                        </button>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div>
                {activeTab === 'INFO' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                             <div className="flex items-center gap-2 mb-4">
                                 <FileAudio size={20} className="text-blue-500" />
                                 <h3 className="font-bold text-slate-700 text-xl">Tracklist & Metadata Detail</h3>
                            </div>

                            <div className="space-y-6">
                                {release.tracks.length === 1 ? (() => {
                                    const track = release.tracks[0];
                                    const isInstrumental = track.isInstrumental === 'Yes';
                                    
                                    return (
                                        <div className="space-y-4">
                                            {/* A: Audio Files */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">A. File Audio</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Audio Master</p>
                                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                            <div className="text-xs font-bold text-slate-700 truncate mb-1" title={getFileName((track as any).audioFile)}>
                                                                {getFileName((track as any).audioFile) || "Belum ada file diupload"}
                                                            </div>
                                                            <AudioPlayer track={track} type="full" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Clip Media Sosial</p>
                                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                            {track.audioClip ? (
                                                                <>
                                                                    <div className="text-xs font-bold text-slate-700 truncate mb-1" title={getFileName(track.audioClip)}>
                                                                        {getFileName(track.audioClip)}
                                                                    </div>
                                                                    <AudioPlayer track={track} type="clip" />
                                                                </>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic py-1.5 font-medium">Belum ada clip</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>


                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* D: Writers & Credits */}
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">D. Penulis, Kredit & Metadata</p>
                                                    <div className="space-y-4">
                                                         {/* Row 1: Composer, Lyricist, Additional Writers */}
                                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Songwriter / Komposer</span>
                                                                 {renderList(track.songwriters || (track.composer ? [track.composer] : []))}
                                                             </div>
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Penulis Lirik</span>
                                                                 {renderList(track.lyricists || (track.lyricist ? [track.lyricist] : []))}
                                                             </div>
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Penulis Tambahan</span>
                                                                 {renderList(track.additionalWriters, 'name', 'role')}
                                                             </div>
                                                         </div>

                                                         {/* Divider Line */}
                                                         <div className="border-t border-slate-200/60 my-2"></div>

                                                         {/* Row 2: Production Credits, Contributors, Bahasa Lirik */}
                                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Kredit Produksi</span>
                                                                 {renderList(track.productionCredits, 'name', 'role')}
                                                             </div>
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Kontributor</span>
                                                                 {renderList(track.contributors, 'name', 'role')}
                                                             </div>
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Bahasa Lirik</span>
                                                                 <p className="text-sm font-extrabold text-slate-800">{(track as any).lyricsLanguage || release.language || '-'}</p>
                                                             </div>
                                                         </div>

                                                         {/* Divider Line */}
                                                         <div className="border-t border-slate-200/60 my-2"></div>

                                                         {/* Row 3: Explicit Content, Instrumental */}
                                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Konten Eksplisit</span>
                                                                 <div className="mt-1">
                                                                     {(() => {
                                                                         const explicitVal = track.explicitLyrics;
                                                                         const isExplicit = (explicitVal as any) === 'YES' || (explicitVal as any) === 'Yes' || (explicitVal as any) === 1 || (explicitVal as any) === true;
                                                                         const explicitText = isExplicit ? 'Yes' : ((explicitVal as any) === 'CLEAN' || (explicitVal as any) === 'Clean') ? 'Clean' : 'No';
                                                                         return (
                                                                             <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase inline-block ${isExplicit ? 'bg-red-100 text-red-700' : explicitText === 'Clean' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-650'}`}>
                                                                                 {explicitText}
                                                                             </span>
                                                                         );
                                                                     })()}
                                                                 </div>
                                                             </div>
                                                             <div>
                                                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-block mb-1.5">Instrumental</span>
                                                                 <p className="text-sm font-extrabold text-slate-800">{isInstrumental ? 'Yes' : 'No'}</p>
                                                             </div>
                                                             <div></div>
                                                         </div>
                                                     </div>
                                                </div>

                                                {/* E: Lyrics Box */}
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">E. Lirik</p>
                                                        {track.lyrics && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(track.lyrics); }}
                                                                className="text-blue-500 hover:text-blue-750 transition-colors flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                                                                title="Salin Lirik"
                                                            >
                                                                <Clipboard size={14} /> Salin Lirik
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                         {isInstrumental ? (
                                                            <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-3.5 h-[300px] flex items-center justify-center text-sm text-slate-500 italic font-semibold">
                                                                Instrumental Track (No lyrics)
                                                            </div>
                                                         ) : track.lyrics ? (
                                                            <div className="bg-white border border-gray-200 rounded-lg p-3.5 h-[300px] overflow-y-auto text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed font-bold shadow-inner">
                                                                {track.lyrics}
                                                            </div>
                                                         ) : (
                                                            <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-3.5 h-[300px] flex items-center justify-center text-sm text-slate-500 italic font-semibold">
                                                                No lyrics provided
                                                            </div>
                                                         )}
                                                    </div>
                                                </div>
                                            </div>


                                        </div>
                                    );
                                })() : (
                                    <div className="space-y-3">
                                        {release.tracks.map((track) => {
                                            const isExpanded = expandedTrackId === track.id;
                                            
                                            return (
                                                <div key={track.id} className={`bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}>
                                                    {/* Track Header (Clickable for Accordion) */}
                                                    <div 
                                                        className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                        onClick={() => toggleTrackExpand(track.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`min-w-8 h-8 px-1.5 rounded-md flex shrink-0 items-center justify-center font-bold text-sm shadow-sm transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-gray-200'}`}>
                                                                {track.trackNumber}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-lg text-slate-800">{track.title}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="text-slate-400">
                                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </div>
                                                    </div>

                                                    {/* Track Details (Conditionally Rendered) */}
                                                    {isExpanded && (
                                                        <div className="p-5 border-t border-gray-100 animate-fade-in bg-slate-50/30 space-y-4">
                                                            {(() => {
                                                                const explicitVal = track.explicitLyrics;
                                                                const isExplicit = (explicitVal as any) === 'YES' || (explicitVal as any) === 'Yes' || (explicitVal as any) === 1 || (explicitVal as any) === true;
                                                                const explicitText = isExplicit ? 'Ya' : ((explicitVal as any) === 'CLEAN' || (explicitVal as any) === 'Clean') ? 'Bersih' : 'Tidak';
                                                                const instrumentalValue = (track as any).isInstrumental;
                                                                const instrumentalText = instrumentalValue === 'Yes' || instrumentalValue === true ? 'Yes' : 'No';
                                                                const fieldLabel = "text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold";

                                                                return (
                                                                    <>
                                                                        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                                            <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4">A. File Audio</h5>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                                <div>
                                                                                    <div className={fieldLabel}>Audio Master</div>
                                                                                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                                                        <div className="text-xs font-bold text-slate-700 truncate mb-1" title={getFileName((track as any).audioFile)}>
                                                                                            {getFileName((track as any).audioFile) || "Belum ada file diupload"}
                                                                                        </div>
                                                                                        <AudioPlayer track={track} type="full" />
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Clip Media Sosial</div>
                                                                                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                                                        {track.audioClip ? (
                                                                                            <>
                                                                                                <div className="text-xs font-bold text-slate-700 truncate mb-1" title={getFileName(track.audioClip)}>
                                                                                                    {getFileName(track.audioClip)}
                                                                                                </div>
                                                                                                <AudioPlayer track={track} type="clip" />
                                                                                            </>
                                                                                        ) : (
                                                                                            <div className="text-xs text-slate-400 italic py-1 font-medium">Belum ada clip</div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>ISRC</div>
                                                                                    <div className="font-mono text-xs font-bold text-slate-800">{isrcInputs[track.id] || track.isrc || "N/A"}</div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <div className={fieldLabel}>Genre</div>
                                                                                        <div className="text-xs font-bold text-slate-800">{track.genre || release.genre || '-'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className={fieldLabel}>Subgenre</div>
                                                                                        <div className="text-xs font-bold text-slate-800">{track.subGenre || (track as any).sub_genre || release.subGenre || (release as any).sub_genre || '-'}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </section>

                                                                        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                                            <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4">C. Artis</h5>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                                <div>
                                                                                    <div className={fieldLabel}>Artis Utama</div>
                                                                                    {renderList(getTrackArtists(track, ['MainArtist', 'PrimaryArtist', 'Primary Artist']), 'name')}
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Artis Featuring</div>
                                                                                    {renderList(getTrackArtists(track, ['FeaturedArtist', 'Featured Artist']), 'name')}
                                                                                </div>
                                                                            </div>
                                                                        </section>

                                                                        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                                            <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4">D. Penulis & Kredit</h5>
                                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
                                                                                <div>
                                                                                    <div className={fieldLabel}>Songwriter / Komposer</div>
                                                                                    {renderList(getNamedPeople((track as any).songwriters, track.composer), 'name')}
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Penulis Lirik</div>
                                                                                    {renderList(getNamedPeople((track as any).lyricists, track.lyricist), 'name')}
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Penulis Tambahan</div>
                                                                                    {renderList((track as any).additionalWriters, 'name', 'roleName')}
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Kredit Produksi</div>
                                                                                    {renderList((track as any).productionCredits, 'name', 'roleName')}
                                                                                </div>
                                                                                <div>
                                                                                    <div className={fieldLabel}>Kontributor</div>
                                                                                    {renderList(track.contributors, 'name', 'roleName')}
                                                                                </div>
                                                                            </div>
                                                                        </section>

                                                                        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                                            <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4">E. Informasi Lirik</h5>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                                                                <div className="space-y-4">
                                                                                    <div>
                                                                                        <div className={fieldLabel}>Bahasa Lirik</div>
                                                                                        <div className="text-xs font-bold text-slate-800">{(track as any).lyricsLanguage || release.language || '-'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className={fieldLabel}>Konten Eksplisit</div>
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${isExplicit ? 'bg-red-100 text-red-700' : explicitText === 'Bersih' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                                                            {explicitText}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className={fieldLabel}>Instrumental</div>
                                                                                        <div className="text-xs font-bold text-slate-800">{instrumentalText}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="flex justify-between items-center mb-1.5">
                                                                                        <span className={fieldLabel}>Lirik</span>
                                                                                        {track.lyrics && (
                                                                                            <button 
                                                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(track.lyrics); }}
                                                                                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                                                                                title="Salin Lirik"
                                                                                            >
                                                                                                <Clipboard size={14} />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {track.lyrics ? (
                                                                                        <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-semibold">
                                                                                            {track.lyrics}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-xs text-slate-500 italic font-medium">Tidak ada lirik</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </section>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {userRole === 'Admin' && activeTab === 'DISTRIBUTION' && (
                    <div className="w-full max-w-none">
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm mb-8 animate-fade-in-up">
                            <h3 className="font-bold text-xl text-slate-800 mb-2">Manajemen Workflow</h3>
                            <p className="text-sm text-slate-500 mb-8 pb-4 border-b border-gray-100">Perbarui status rilis untuk melanjutkan prosesnya.</p>
                            
                            <div className="space-y-8">
                                {/* Status Selector */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">Status Rilis</label>
                                    <select 
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 font-bold text-black
                                            ${status === 'Rejected' ? 'border-red-200 bg-red-50 focus:border-red-500 focus:ring-red-100' : 
                                            status === 'Live' ? 'border-green-200 bg-green-50 focus:border-green-500 focus:ring-green-100' :
                                            'border-blue-200 bg-white focus:border-blue-500 focus:ring-blue-100'}
                                        `}
                                    >
                                        <option value="Pending" className="text-black">Menunggu Review</option>
                                        <option value="Request Edit" className="text-black">Minta Revisi</option>
                                        <option value="Processing" className="text-black">Diproses (Agregator)</option>
                                        <option value="Live" className="text-black">Rilis</option>
                                        <option value="Rejected" className="text-black">Ditolak</option>
                                    </select>
                                </div>

                                {/* --- REJECTION WORKFLOW --- */}
                                {status === 'Rejected' && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 animate-fade-in-down">
                                        <h4 className="font-bold text-red-800 flex items-center gap-2 mb-4 text-lg">
                                            <AlertTriangle size={20} /> Detail Penolakan
                                        </h4>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Alasan Utama</label>
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
                                                        title="Buat deskripsi detail dengan AI"
                                                    >
                                                        {isGeneratingAi ? <Loader2 size={16} className="animate-spin"/> : "OK"}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-red-500 mt-1.5 font-medium">Klik OK untuk membuat deskripsi detail otomatis menggunakan AI.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1 flex justify-between">
                                                    <span>Deskripsi Detail (Email ke User)</span>
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

const MetaItem: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col border border-[#edf0f5] rounded-xl p-4 bg-slate-50/40">
    <div className="mb-2">
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-750 border border-blue-100 rounded inline-flex items-center gap-1.5">
        {React.cloneElement(icon as React.ReactElement, { size: 12, className: 'text-blue-600' } as any)} {label}
      </span>
    </div>
    <div className="text-sm font-extrabold text-slate-900 break-words">{value || "-"}</div>
  </div>
);
