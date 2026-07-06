import React, { useState } from 'react';
import { ReleaseData } from '@/types';
import { api } from '@/utils/api';
import { assetUrl } from '@/utils/url';
import { Disc, CheckCircle, Loader2, AlertCircle, FileAudio, User, Music2, FileText, Calendar, Globe, Tag, Mic2, Users, PlayCircle, ChevronLeft, X, Check, ExternalLink, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { AlertModal } from '../../components/AlertModal';
import { useGenres, useSubGenres } from '@/hooks/useGenres';

interface Props {
  data: ReleaseData;
  onSave: (data: ReleaseData) => void;
  onBack: () => void;
  userRole?: string;
  userType?: 'Company' | 'Personal' | null;
  token?: string;
}

export const Step4Review: React.FC<Props> = ({ data, onSave, onBack, userRole, userType, token: propToken }) => {
  const { genres } = useGenres();
  const { subgenres } = useSubGenres(data.genreId);

  // Resolve genre/subgenre names from IDs
  const resolvedGenreName = data.genre || genres.find(g => g.id.toString() === data.genreId?.toString())?.name || '';
  const resolvedSubGenreName = (data as any).subGenre || subgenres.find(s => s.id.toString() === data.subgenreId?.toString())?.name || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [uploadStartTs, setUploadStartTs] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [fileProgress, setFileProgress] = useState<number>(0);
  const [uploadQueue, setUploadQueue] = useState<{ key: string; label: string; status: 'Queued' | 'Uploading' | 'Done'; progress: number }[]>([]);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  
  const renderList = (arr: any[], nameKey = 'name', roleKey?: string) =>
    (!arr || arr.length === 0) ? <span className="text-slate-400">-</span> :
      <div className="flex flex-col gap-0.5">
        {arr.map((item: any, i: number) => {
          const roleVal = roleKey ? (item[roleKey] || item.role || item.roleName || item.role_name || '') : '';
          return (
            <span key={i} className="text-slate-700 text-xs">
              {typeof item === 'string' ? item : item[nameKey] || '-'}
              {roleVal ? <span className="text-slate-400 ml-1">({roleVal})</span> : null}
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

  const formatGenreSubGenre = (track: any) => {
    const genre = track.genre || data.genre || resolvedGenreName || '';
    const subGenre = track.subGenre || track.sub_genre || data.subGenre || (data as any).sub_genre || resolvedSubGenreName || '';
    return genre ? `${genre}${subGenre ? ` / ${subGenre}` : ''}` : '-';
  };

  React.useEffect(() => {
    if (isSubmitting && uploadTotal > 0) {
      const id = setInterval(() => setNowTs(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [isSubmitting, uploadTotal]);

  const handleSubmit = async () => {
    // --- VALIDATION START ---
    const errors: string[] = [];

    // Skip validation if Admin
    if (userRole !== 'Admin') {
      // 1. Validate Release Level
      if (!data.coverArt) {
        errors.push("Cover Art is required.");
      }
      if (!data.title) errors.push("Release Title is required.");
      if (!data.primaryArtists || data.primaryArtists.length === 0 || !data.primaryArtists[0]) {
        errors.push("Primary Artist is required.");
      } else {
        const firstArtist = data.primaryArtists[0];
        const name = typeof firstArtist === 'string' ? firstArtist : firstArtist.name;
        if (!name || name.trim() === '') {
          errors.push("Primary Artist Name is required.");
        }
      }
      // Genre is only required for ALBUM/EP, not Single
      if (data.type !== 'SINGLE') {
        if (!data.genre) errors.push("Release Genre is required.");
      }
      if (data.type === 'SINGLE' && !data.language) errors.push("Language / Territory is required.");
      if (!data.version && !(data as any).releaseVersion) errors.push("Release Version is required.");

      // Lyrics Language is required for SINGLE (non-instrumental)
      if (data.type === 'SINGLE') {
        const d = data as any;
        if (!d.isInstrumental) {
          if (!d.lyricsLanguage && !data.language) {
            errors.push("Lyrics Language is required.");
          }
        }
      }

      // Label is only required for Company/PT accounts. 
      // For Personal, it defaults to 'Dimensi Suara' in the backend/Step 1, 
      // but we double check here to satisfy validation.
      if (userType === 'Company' && !data.label) {
        errors.push("Record Label is required.");
      }

      if (data.type === 'SINGLE' && !data.plannedReleaseDate) errors.push("Release Date is required.");

      // 2. Validate Track Level
      // For SINGLE: data is stored at release level, not in tracks array — skip track-level checks
      if (data.type !== 'SINGLE') {
        if (!data.tracks || data.tracks.length === 0) {
          errors.push("At least one track is required.");
        } else {
          data.tracks.forEach((track, idx) => {
            const trackNum = idx + 1;
            if (!track.title) errors.push(`Track ${trackNum}: Title is required.`);
            const hasAudio = (typeof (track as any).audioFile === 'string' && (track as any).audioFile.trim().length > 0)
              || (typeof (track as any).tempAudioPath === 'string' && (track as any).tempAudioPath.trim().length > 0)
              || ((track as any).audioFile instanceof File);
            if (!hasAudio) errors.push(`Track ${trackNum}: Audio file is required (server TMP or URL).`);
            const hasClip = (typeof (track as any).audioClip === 'string' && (track as any).audioClip.trim().length > 0)
              || (typeof (track as any).tempClipPath === 'string' && (track as any).tempClipPath.trim().length > 0)
              || ((track as any).audioClip instanceof File);
            if (!hasClip) errors.push(`Track ${trackNum}: Audio clip is required (server TMP or URL).`);
            if (!track.genre) errors.push(`Track ${trackNum}: Genre is required.`);
            if (!track.composer) errors.push(`Track ${trackNum}: Composer is required.`);

            // Conditional Validation based on Instrumental
            if (track.isInstrumental !== 'Yes') {
              if (!track.lyricist) errors.push(`Track ${trackNum}: Lyricist is required (since it's not Instrumental).`);
              if (!track.explicitLyrics) errors.push(`Track ${trackNum}: Explicit Lyrics status is required.`);
              if (!(track as any).lyricsLanguage) errors.push(`Track ${trackNum}: Lyrics Language is required.`);
            }
          });
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidationModal(true);
        return;
      }
    }
    // --- VALIDATION END ---

    setIsSubmitting(true);
    try {
      const token = propToken || (typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '');
      // In Next.js with cookies, token might be empty here, but api.ts will use credentials: 'include'.
      // If token is missing AND there is no valid cookie, the API will return an error that will be caught below.

      const prepped: ReleaseData = {
        ...data,
        // Ensure default labels for personal accounts
        label: (userType !== 'Company' && !data.label) ? 'Dimensi Suara' : data.label,
        pLine: (userType !== 'Company' && !data.pLine) ? 'Dimensi Suara' : data.pLine,
        cLine: (userType !== 'Company' && !data.cLine) ? 'Dimensi Suara' : data.cLine,
        // Filter out empty artists and handle object structure
        primaryArtists: (data.primaryArtists || []).filter(a => {
          const name = typeof a === 'string' ? a : a?.name;
          return name && name.trim().length > 0;
        }),
        userId: data.userId, // Ensure original owner is preserved
        tracks: (data.tracks || []).map(t => ({ ...t }))
      };

      // If Single, copy Release-level ISRC to the track if available
      if (prepped.type === 'SINGLE' && prepped.isrc && prepped.tracks.length > 0) {
        prepped.tracks[0].isrc = prepped.isrc;
      }

      let total = 0;
      if (prepped.coverArt instanceof File) total += 1;
      prepped.tracks.forEach(t => {
        const anyT = t as any;
        if (anyT.audioFile instanceof File) total += 1;
        if (anyT.audioClip instanceof File) total += 1;
        if (anyT.iplFile instanceof File) total += 1;
      });
      setUploadTotal(total);
      setUploadDone(0);
      setUploadStartTs(Date.now());
      const queueBuild: { key: string; label: string; status: 'Queued' | 'Uploading' | 'Done'; progress: number }[] = [];
      const uploadErrors: string[] = [];

      if (prepped.coverArt instanceof File) {
        queueBuild.push({ key: 'coverArt', label: 'Cover Art', status: 'Queued', progress: 0 });
      }
      for (let i = 0; i < prepped.tracks.length; i++) {
        const t = prepped.tracks[i] as any;
        if (t.audioFile instanceof File) {
          queueBuild.push({ key: `track_${i}_audio`, label: `Track ${i + 1} Audio`, status: 'Queued', progress: 0 });
        }
        if (t.audioClip instanceof File) {
          queueBuild.push({ key: `track_${i}_clip`, label: `Track ${i + 1} Clip`, status: 'Queued', progress: 0 });
        }
        if (t.iplFile instanceof File) {
          queueBuild.push({ key: `track_${i}_ipl`, label: `Track ${i + 1} IPL`, status: 'Queued', progress: 0 });
        }
      }
      setUploadQueue(queueBuild);
      const setQ = (key: string, status?: 'Queued' | 'Uploading' | 'Done', progress?: number) => {
        setUploadQueue(prev => prev.map(it => it.key === key ? { ...it, status: status ?? it.status, progress: progress ?? it.progress } : it));
      };
      if (prepped.coverArt instanceof File) {
        try {
          setUploadLabel('Cover Art');
          setFileProgress(0);
          setQ('coverArt', 'Uploading', 0);
          const resp: any = await api.uploadReleaseFileProgress(
            token,
            { title: prepped.title, primaryArtists: prepped.primaryArtists },
            'coverArt',
            prepped.coverArt,
            (p: number) => setFileProgress(p)
          );
          const candidate =
            (resp && resp.paths && resp.paths['coverArt']) ||
            (resp && resp.paths && resp.paths['file']) ||
            (resp && resp.path) ||
            (resp && resp.url) ||
            '';
          if (candidate) {
            prepped.coverArt = candidate;
          } else {
            uploadErrors.push('Cover Art upload failed: Invalid response from server.');
          }
        } catch (e: any) { 
          uploadErrors.push('Cover Art upload error: ' + (e?.message || 'Unknown error'));
        }
        finally {
          setUploadDone(prev => prev + 1);
          setFileProgress(100);
          setQ('coverArt', 'Done', 100);
        }
      }
      for (let i = 0; i < prepped.tracks.length; i++) {
        const t = prepped.tracks[i] as any;
        if (t.iplFile instanceof File) {
          const fieldName = `track_${i}_ipl`;
          try {
            setUploadLabel(`Track ${i + 1} IPL`);
            setFileProgress(0);
            setQ(fieldName, 'Uploading', 0);
            const resp: any = await api.uploadReleaseFileProgress(
              token,
              { title: prepped.title, primaryArtists: prepped.primaryArtists },
              fieldName,
              t.iplFile,
              (p: number) => setFileProgress(p)
            );
            const candidate =
              (resp && resp.paths && resp.paths[fieldName]) ||
              (resp && resp.paths && resp.paths['file']) ||
              (resp && resp.path) ||
              (resp && resp.url) ||
              (resp && resp[fieldName]) ||
              '';
            if (candidate) {
              prepped.tracks[i].iplFile = candidate;
            } else {
              uploadErrors.push(`Track ${i + 1} IPL upload failed: Invalid response.`);
            }
          } catch (e: any) { 
            uploadErrors.push(`Track ${i + 1} IPL upload error: ` + (e?.message || 'Unknown error'));
          }
          finally {
            setUploadDone(prev => prev + 1);
            setFileProgress(100);
            setQ(fieldName, 'Done', 100);
          }
        }
        if ((!t.tempAudioPath || typeof t.tempAudioPath !== 'string' || !t.tempAudioPath.trim()) && t.audioFile instanceof File) {
          const fieldName = `track_${i}_audio_tmp`;
          try {
            setUploadLabel(`Track ${i + 1} Audio`);
            setFileProgress(0);
            setQ(fieldName, 'Uploading', 0);
            // Always chunk for reliability, especially for full tracks
            const resp: any = await api.uploadTmpReleaseFileChunked(
              token,
              { title: prepped.title, primaryArtists: prepped.primaryArtists },
              `track_${i}_audio`,
              t.audioFile,
              10 * 1024 * 1024,
              (p: number) => {
                setFileProgress(p);
                setQ(fieldName, 'Uploading', p);
              }
            );
            const candidate =
              (resp && resp.paths && resp.paths[`track_${i}_audio`]) ||
              (resp && resp.paths && resp.paths['file']) ||
              (resp && resp.path) ||
              (resp && resp.url) ||
              '';
            if (candidate) {
              prepped.tracks[i].tempAudioPath = candidate;
              prepped.tracks[i].audioFile = candidate;
            } else {
              uploadErrors.push(`Track ${i + 1} Audio upload failed: Invalid response.`);
            }
          } catch (e: any) { 
            uploadErrors.push(`Track ${i + 1} Audio upload error: ` + (e?.message || 'Unknown error'));
          }
          finally {
            setUploadDone(prev => prev + 1);
            setFileProgress(100);
            setQ(fieldName, 'Done', 100);
          }
        }
        if ((!t.tempClipPath || typeof t.tempClipPath !== 'string' || !t.tempClipPath.trim()) && t.audioClip instanceof File) {
          const fieldName = `track_${i}_clip_tmp`;
          try {
            setUploadLabel(`Track ${i + 1} Clip`);
            setFileProgress(0);
            setQ(fieldName, 'Uploading', 0);
            // Always chunk for reliability
            const resp: any = await api.uploadTmpReleaseFileChunked(
              token,
              { title: prepped.title, primaryArtists: prepped.primaryArtists },
              `track_${i}_clip`,
              t.audioClip,
              10 * 1024 * 1024,
              (p: number) => {
                setFileProgress(p);
                setQ(fieldName, 'Uploading', p);
              }
            );
            const candidate =
              (resp && resp.paths && resp.paths[`track_${i}_clip`]) ||
              (resp && resp.paths && resp.paths['file']) ||
              (resp && resp.path) ||
              (resp && resp.url) ||
              '';
            if (candidate) {
              prepped.tracks[i].tempClipPath = candidate;
              prepped.tracks[i].audioClip = candidate;
              if (typeof prepped.tracks[i].previewStart !== 'number') {
                prepped.tracks[i].previewStart = 0;
              }
            } else {
              uploadErrors.push(`Track ${i + 1} Clip upload failed: Invalid response.`);
            }
          } catch (e: any) { 
            uploadErrors.push(`Track ${i + 1} Clip upload error: ` + (e?.message || 'Unknown error'));
          }
          finally {
            setUploadDone(prev => prev + 1);
            setFileProgress(100);
            setQ(fieldName, 'Done', 100);
          }
        }
      }
      // Verify: ensure audio/clip exist via tmp path or server URL
      prepped.tracks.forEach((t: any, idx: number) => {
        const audioOk = (typeof t.audioFile === 'string' && t.audioFile.trim().length > 0) ||
          (typeof t.tempAudioPath === 'string' && t.tempAudioPath.trim().length > 0);
        if (!audioOk) uploadErrors.push(`Track ${idx + 1}: Audio file belum ada di server (TMP).`);
        const clipOk = (typeof t.audioClip === 'string' && t.audioClip.trim().length > 0) ||
          (typeof t.tempClipPath === 'string' && t.tempClipPath.trim().length > 0);
        if (!clipOk) uploadErrors.push(`Track ${idx + 1}: Audio clip belum ada di server (TMP).`);
      });
      if (uploadErrors.length > 0) {
        setValidationErrors(uploadErrors);
        setShowValidationModal(true);
        setIsSubmitting(false);
        return;
      }
      // Sanitize: ensure no File objects remain in payload
      if (prepped.coverArt instanceof File) {
        prepped.coverArt = null;
      }
      prepped.tracks = prepped.tracks.map((t: any) => {
        const norm = { ...t };
        if (norm.audioFile instanceof File) norm.audioFile = '';
        if (norm.audioClip instanceof File) norm.audioClip = '';
        if (norm.iplFile instanceof File) norm.iplFile = '';
        return norm;
      });

      const isEditing = !!(data.id && !String(data.id).startsWith('temp_'));
      let result;
      if (isEditing) {
        result = await api.updateRelease(token, data.id, prepped);
      } else {
        result = await api.createRelease(token, prepped);
      }

      if (result.isDuplicate) {
        setShowDuplicateModal(true);
        return;
      }

      const normalizedId = String(result.id ?? data.id ?? Date.now());
      const finalizedData: ReleaseData = {
        ...prepped,
        id: normalizedId,
        status: 'Pending',
        submissionDate: new Date().toISOString().split('T')[0],
        type: data.type
      };
      onSave(finalizedData);
      setSuccessMsg(result.message || 'Release submitted successfully');
      try {
        // Backend now handles object-based primaryArtists correctly
        await api.cleanupTmp(token, { title: prepped.title, primaryArtists: prepped.primaryArtists });
      } catch (e) {
        console.warn('TMP cleanup after submit failed:', (e as any)?.message || e);
      }

    } catch (error: any) {
      console.error("Submission failed:", error);
      // Prioritize payload error message from server if available
      let message = error?.payload?.error || error?.message || "Please try again.";

      if (error?.status === 413 || message === 'UPLOAD_TOO_LARGE' || /content too large|payload too large|413/i.test(message)) {
        message = "Total ukuran file (cover + audio + clip) terlalu besar untuk dikirim. Coba kompres atau perkecil ukuran file, atau kurangi jumlah track per sekali upload.";
      }

      // Show clearer error if available
      if (error?.payload?.details && Array.isArray(error.payload.details)) {
        message += '\nDetails: ' + error.payload.details.join(', ');
      }

      setAlertState({
        isOpen: true,
        title: 'Upload Failed',
        message: message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-medium text-slate-800 mb-2">Submission Successful!</h2>
        <p className="text-slate-500 mt-1 text-sm">Your release has been submitted for review.</p>

        <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200 text-left text-sm max-w-lg shadow-inner w-full">
          <p className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <AlertCircle size={18} /> Status Summary:
          </p>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
              Files uploaded to Server
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
              Metadata saved to Database
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
              Status: Pending Review
            </li>
          </ul>
        </div>

        <div className="mt-8">
          <p className="text-slate-400 text-sm mb-4">You can view this in the "All Releases" tab.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Final Review</h2>
        <p className="text-xs text-slate-600">Please verify all information before submitting your release.</p>
      </div>

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
                {data.coverArt ? (
                  <div className="relative group w-full h-full">
                    <img
                      src={
                        typeof data.coverArt === 'string'
                          ? assetUrl(data.coverArt)
                          : (data.coverArt instanceof Blob ? URL.createObjectURL(data.coverArt) : '/assets/placeholder-cover.jpg')
                      }
                      alt="Cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg';
                        (e.target as HTMLImageElement).onerror = null;
                      }}
                    />
                    {typeof data.coverArt === 'string' && data.coverArt.startsWith('http') && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={data.coverArt}
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
                  {data.tracks.length > 1 ? 'Album / EP' : 'Single'}
                </span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <MetaItem label="Release Title" value={data.title} icon={<FileText size={10} />} />
              <MetaItem
                label="Primary Artist"
                value={
                  <div className="flex flex-col gap-1">
                    {data.primaryArtists.map((a, idx) => {
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
              <MetaItem label="Label" value={data.label} icon={<Users size={10} />} />

              <MetaItem label="Language" value={data.language || (data as any).lyricsLanguage} icon={<Globe size={10} />} />
              <MetaItem label="Genre" value={resolvedGenreName} icon={<Music2 size={10} />} />
              <MetaItem label="Sub Genre" value={resolvedSubGenreName} icon={<Music2 size={10} />} />
              <MetaItem label="Version" value={data.version || data.releaseVersion} icon={<Tag size={10} />} />

              <MetaItem label="Release Date" value={data.plannedReleaseDate || "TBD"} icon={<Calendar size={10} />} />
              <MetaItem label="UPC" value={data.upc || "Auto-Generated"} icon={<FileAudio size={10} />} />
              <MetaItem label="ISRC" value={data.isrc || "Auto-Generated"} icon={<FileAudio size={10} />} />
              <MetaItem
                label="Distribution Type"
                value={data.isNewRelease ? "New Release" : `Re-release (Orig: ${data.originalReleaseDate})`}
                icon={<Disc size={10} />}
              />

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
          {data.type === 'SINGLE' && (!data.tracks || data.tracks.length === 0) ? (() => {
            const d = data as any;
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
                  {data.isrc && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">ISRC</p>
                      <p className="text-xs font-mono font-bold text-slate-700">{data.isrc}</p>
                    </div>
                  )}
                </div>

                {/* C: Artists */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">C. Artists</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Primary Artists</p>
                      {renderList(data.primaryArtists)}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Featured Artists</p>
                      {renderList(featuredArtists)}
                    </div>
                  </div>
                </div>

                {/* D: Writers & Credits */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">D. Writers & Credits</p>
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

                {/* E: Lyrics Info */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">E. Lyrics Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics Language</p>
                        <p className="text-xs font-bold text-slate-800">{d.lyricsLanguage || data.language || '-'}</p>
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
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics</p>
                      {isInstrumental ? (
                        <p className="text-xs text-slate-500 italic">Instrumental Track (No lyrics)</p>
                      ) : (
                        <p className="text-xs text-slate-700">{d.lyrics ? `${d.lyrics.substring(0, 60)}${d.lyrics.length > 60 ? '…' : ''}` : '-'}</p>
                      )}
                    </div>
                  </div>
                </div>


              </div>
            );
          })() : (
            <div className="space-y-3">
              {data.tracks.map((track) => {
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
                  <div key={track.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 sm:p-4 transition-all hover:shadow-md">
                    <div 
                      className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer group"
                      onClick={() => setExpandedTrackId(expandedTrackId === track.id ? null : track.id)}
                    >
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 flex-wrap group-hover:text-blue-600 transition-colors">
                        <span className="bg-blue-100 text-blue-700 w-6 aspect-square rounded-full flex items-center justify-center text-xs shrink-0">{track.trackNumber}</span>
                        <span>{track.title}</span>
                        {track.isrc && (
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200 ml-1 mt-0.5">
                            {track.isrc}
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <div className="flex gap-2">
                          {typeof track.audioFile === 'string' && track.audioFile.startsWith('http') && (
                            <a href={track.audioFile} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center justify-center" title="Download Audio">
                              <Download size={14} />
                            </a>
                          )}
                          {typeof track.audioClip === 'string' && track.audioClip.startsWith('http') && (
                            <a href={track.audioClip} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors flex items-center justify-center" title="Download Clip">
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                        <div className="p-1.5 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 rounded transition-colors ml-2">
                          {expandedTrackId === track.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedTrackId === track.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Audio File</div>
                            {typeof track.audioFile === 'string' && track.audioFile.startsWith('http') ? (
                              <a href={track.audioFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-200 transition-colors">
                                <Download size={14} /> Download Audio
                              </a>
                            ) : track.audioFile instanceof File ? (
                              <span className="text-xs text-slate-500">{track.audioFile.name} (Ready)</span>
                            ) : (
                              <span className="text-xs text-slate-500">Not Available</span>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Clip File</div>
                            {typeof track.audioClip === 'string' && track.audioClip.startsWith('http') ? (
                              <a href={track.audioClip} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-xs font-bold hover:bg-orange-200 transition-colors">
                                <Download size={14} /> Download Clip
                              </a>
                            ) : track.audioClip instanceof File ? (
                              <span className="text-xs text-slate-500">{track.audioClip.name} (Ready)</span>
                            ) : (
                              <span className="text-xs text-slate-500">Not Available</span>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Primary Artists</div>
                            {renderList(getTrackArtists(anyTrack, ['MainArtist', 'PrimaryArtist', 'Primary Artist']), 'name')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Track Number</div>
                            <div className="text-xs font-bold text-slate-800">{track.trackNumber || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Explicit Content</div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${track.explicitLyrics === 'Yes' ? 'bg-red-100 text-red-700' : track.explicitLyrics === 'Clean' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                              {track.explicitLyrics === 'Yes' ? 'Yes' : track.explicitLyrics === 'Clean' ? 'Clean' : 'No'}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Genre & Sub Genre</div>
                            <div className="text-xs font-bold text-slate-800">
                              {formatGenreSubGenre(track)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics Language</div>
                            <div className="text-xs font-bold text-slate-800">{(track as any).lyricsLanguage || data.language || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Featured Artists</div>
                            {renderList(getTrackArtists(anyTrack, ['FeaturedArtist', 'Featured Artist']), 'name')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Songwriters / Composers</div>
                            {renderList(getNamedPeople(anyTrack.songwriters, track.composer), 'name')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyricist</div>
                            {renderList(getNamedPeople(anyTrack.lyricists, track.lyricist), 'name')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Instrumental</div>
                            <div className="text-xs font-bold text-slate-800">{track.isInstrumental || 'No'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Additional Writers</div>
                            {renderList(anyTrack.additionalWriters, 'name', 'roleName')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Production Credits</div>
                            {renderList(anyTrack.productionCredits, 'name', 'roleName')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Contributors</div>
                            {renderList(anyTrack.contributors, 'name', 'roleName')}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">ISRC Code</div>
                            <div className="font-mono text-xs font-bold text-slate-800">{track.isrc || 'N/A'}</div>
                          </div>
                          {track.isInstrumental !== 'Yes' && (
                            <div className="md:col-span-2">
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Lyrics</div>
                              {track.lyrics ? (
                                <div className="bg-white border border-gray-200 rounded p-3 max-h-40 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap">
                                  {track.lyrics}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">-</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      <div className="mt-8 flex flex-col items-end border-t border-gray-100 pt-6 pb-8">
        {isSubmitting && uploadTotal > 0 && (
          <div className="w-full md:w-[400px] mb-4 bg-white border border-slate-200 rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-slate-700">Uploading Files</div>
              <div className="text-xs text-slate-500">{uploadDone}/{uploadTotal}</div>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500"
                style={{ width: `${Math.round((uploadDone / uploadTotal) * 100)}%` }}
              ></div>
            </div>
            {uploadLabel && (
              <div className="mt-2 text-xs text-slate-500">Current: {uploadLabel}</div>
            )}
            <div className="mt-2">
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gradient-to-r from-orange-500 to-yellow-400"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(fileProgress)))}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-slate-400">{Math.round(fileProgress)}%</div>
            </div>
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadQueue.map(item => (
                  <div key={item.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${item.status === 'Done' ? 'bg-green-50 text-green-700 border-green-200' :
                          item.status === 'Uploading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>{item.status}</span>
                      <span className="text-slate-400">{Math.round(item.progress)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-slate-400">
              {(() => {
                const elapsed = uploadStartTs ? Math.max(0, Math.floor((nowTs - uploadStartTs) / 1000)) : 0;
                const fmt = (s: number) => {
                  const m = Math.floor(s / 60);
                  const sec = s % 60;
                  return `${m}m ${sec}s`;
                };
                if (uploadDone > 0) {
                  const avg = elapsed / uploadDone;
                  const remaining = Math.max(0, Math.round(avg * (uploadTotal - uploadDone)));
                  return `Elapsed: ${fmt(elapsed)} · ETA: ${fmt(remaining)}`;
                }
                return `Elapsed: ${fmt(elapsed)} · ETA: estimating...`;
              })()}
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm hover:shadow-lg hover:shadow-orange-400/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Submit Release
                <Check size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* VALIDATION MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
            <div className="bg-red-50 p-5 border-b border-red-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-red-500" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-700">Incomplete Data</h3>
                <p className="text-xs text-red-600">Please fix the following issues before submitting:</p>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <ul className="space-y-3">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700 bg-gray-50 p-4 rounded border border-gray-100">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2.5 flex-shrink-0"></span>
                    <span className="text-xs font-medium leading-relaxed">{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-6 py-2.5 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
            <div className="bg-orange-50 p-5 border-b border-orange-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-orange-500" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800">Duplicate Release</h3>
                <p className="text-xs text-orange-700">This release already exists.</p>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-orange-400 hover:text-orange-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                A release with the title <strong>"{data.title}"</strong> and version <strong>"{data.version}"</strong> has already been submitted.
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                Please change the <strong>Version</strong> (e.g., to "Remix" or "Radio Edit") or the <strong>Title</strong> to differentiate it from the existing release.
              </p>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-6 py-2.5 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
              >
                Okay, I'll Change It
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// --- Helper Components ---

const MetaItem: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col border border-gray-200 rounded p-3 bg-slate-50/50">
    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {React.cloneElement(icon as React.ReactElement, { size: 14 } as any)} {label}
    </span>
    <div className="text-xs font-bold text-slate-900 break-words">{value || "-"}</div>
  </div>
);
