"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ReleaseData } from '@/types';
import { api } from '@/utils/api';
import { ReleaseWizard } from '../../../../../../screens/ReleaseWizard';

export default function EditReleasePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState('Admin'); // Placeholder, sync with real auth
  const token = ''; // Handled implicitly by Next.js rewrites/cookies

  useEffect(() => {
    // Safe check for browser environment
    if (typeof window !== 'undefined') {
        const role = localStorage.getItem('cms_role') || 'Admin';
        setUserRole(role);
    }
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) { setError('Invalid release id'); setLoading(false); return; }
      try {
        const raw: any = await api.getRelease(token, id);
        const mapArtists = (arr: any) => {
          if (Array.isArray(arr)) return arr;
          if (typeof arr === 'string') {
            try {
              const parsed = JSON.parse(arr);
              if (Array.isArray(parsed)) return parsed;
            } catch {}
            return [arr];
          }
          return [];
        };
        const primaryArtists = mapArtists(raw.primaryArtists);

        const ownerDisplayName = raw.ownerDisplayName || '';

        const mapped: ReleaseData = {
          id: String(raw.id),
          userId: raw.user_id,
          status: raw.status,
          submissionDate: raw.submission_date,
          aggregator: raw.aggregator,
          coverArt: raw.cover_art || null,
          type: raw.release_type,
          upc: raw.upc || '',
          title: raw.title || '',
          language: raw.language || '',
          primaryArtists,
          label: raw.label || '',
          genre: raw.genre || (raw.tracks && raw.tracks.length > 0 ? raw.tracks[0].genre : '') || '',
          genreId: raw.genre_id || raw.genreId || (raw.tracks && raw.tracks.length > 0 ? (raw.tracks[0].genre_id || raw.tracks[0].genreId) : undefined),
          subGenre: raw.sub_genre || (raw.tracks && raw.tracks.length > 0 ? raw.tracks[0].sub_genre : '') || '',
          subgenreId: raw.subgenre_id || raw.subgenreId || (raw.tracks && raw.tracks.length > 0 ? (raw.tracks[0].subgenre_id || raw.tracks[0].subgenreId) : undefined),
          pLine: raw.p_line || '',
          cLine: raw.c_line || '',
          version: raw.version || '',
          tracks: (raw.tracks || []).map((t: any) => {
            const p = mapArtists(t.primaryArtists ?? t.primary_artists);
            const f = mapArtists(t.featuredArtists ?? t.featured_artists);
            return {
              id: String(t.id ?? `${raw.id}_${t.track_number}`),
              audioFile: t.audio_file || null,
              audioClip: t.audio_clip || null,
              videoFile: null,
              trackNumber: String(t.track_number ?? ''),
              releaseDate: '',
              isrc: t.isrc || '',
              title: t.title || '',
              duration: t.duration || '',
              artists: [
                ...p.map((item: any) => ({ name: typeof item === 'string' ? item : item.name, role: 'MainArtist' })),
                ...f.map((item: any) => ({ name: typeof item === 'string' ? item : item.name, role: 'FeaturedArtist' })),
              ],
              genre: t.genre || '',
              genreId: t.genre_id || t.genreId,
              subGenre: t.sub_genre || '',
              subgenreId: t.subgenre_id || t.subgenreId,
              isInstrumental: t.is_instrumental ? 'Yes' : 'No',
              explicitLyrics: t.explicit_lyrics || 'No',
              composer: t.composer || '',
              lyricist: t.lyricist || '',
              lyrics: t.lyrics || '',
              contributors: Array.isArray(t.contributors) ? t.contributors : [],
              primaryArtists: p,
              featuredArtists: f,
              songwriters: Array.isArray(t.songwriters) ? t.songwriters : [],
              lyricists: Array.isArray(t.lyricists) ? t.lyricists : [],
              additionalWriters: Array.isArray(t.additionalWriters ?? t.additional_writers) ? (t.additionalWriters ?? t.additional_writers) : [],
              productionCredits: Array.isArray(t.productionCredits ?? t.production_credits) ? (t.productionCredits ?? t.production_credits) : []
            };
          }),
          isNewRelease: !raw.original_release_date && !raw.upc,
          originalReleaseDate: raw.original_release_date || '',
          plannedReleaseDate: raw.planned_release_date || '',
          preReleaseSocialMedia: raw.pre_release_social_media || raw.preReleaseSocialMedia || '',
          preReleaseYoutubeMusic: raw.pre_release_youtube_music || raw.preReleaseYoutubeMusic || '',
          rejectionReason: raw.rejection_reason || '',
          rejectionDescription: raw.rejection_description || ''
        };

        if (mapped.type === 'SINGLE' && mapped.tracks.length > 0) {
            const t0 = mapped.tracks[0];
            const t0Raw = raw.tracks[0];
            (mapped as any).songwriters = t0.songwriters;
            (mapped as any).lyricists = t0.lyricists;
            (mapped as any).additionalWriters = t0.additionalWriters;
            (mapped as any).productionCredits = t0.productionCredits;
            (mapped as any).contributors = t0.contributors;
            (mapped as any).featuredArtists = (t0 as any).featuredArtists;
            (mapped as any).lyricsLanguage = raw.language || t0Raw.lyrics_language || t0Raw.lyricsLanguage || '';
            (mapped as any).explicitType = (t0.explicitLyrics || 'No').toUpperCase();
            (mapped as any).lyrics = t0.lyrics;
            (mapped as any).isInstrumental = t0.isInstrumental === 'Yes';
            (mapped as any).masterUploadId = (t0Raw as any).audio_file || null;
            (mapped as any).socialMediaUploadId = (t0Raw as any).audio_clip || null;
            (mapped as any).isrc = t0.isrc || '';
        }
        
        let distributionTargets: any[] = [];
        const E: Record<string, any> = {
            SOCIAL: { id: "SOCIAL", label: "Social Media", logo: "" },
            YOUTUBE_MUSIC: { id: "YOUTUBE_MUSIC", label: "YouTube Music", logo: "" },
            ALL_DSP: { id: "ALL_DSP", label: "All DSP", logo: "" }
        };
        if (Array.isArray(raw.distributionTargets)) {
            distributionTargets = typeof raw.distributionTargets[0] === 'string' 
                ? raw.distributionTargets.map((x: string) => E[x]).filter(Boolean) 
                : raw.distributionTargets;
        } else if (Array.isArray(raw.distribution_targets)) {
            distributionTargets = typeof raw.distribution_targets[0] === 'string' 
                ? raw.distribution_targets.map((x: string) => E[x]).filter(Boolean) 
                : raw.distribution_targets;
        } else if (typeof raw.distributionTargets === 'string') {
            try {
                const parsed = JSON.parse(raw.distributionTargets);
                if (Array.isArray(parsed)) distributionTargets = parsed.map((x: string) => E[x]).filter(Boolean);
            } catch {}
        } else if (typeof raw.distribution_targets === 'string') {
            try {
                const parsed = JSON.parse(raw.distribution_targets);
                if (Array.isArray(parsed)) distributionTargets = parsed.map((x: string) => E[x]).filter(Boolean);
            } catch {}
        }
        
        if (distributionTargets.length === 0) {
            distributionTargets = [E.SOCIAL, E.YOUTUBE_MUSIC, E.ALL_DSP];
        }

        mapped.distributionTargets = distributionTargets;

        (mapped as any).ownerDisplayName = ownerDisplayName;
        setRelease(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load release detail');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, token]);

  if (loading) return null;
  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>
        <button onClick={() => router.push('/releases')} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg font-medium">Back to Releases</button>
      </div>
    );
  }
  if (!release) return null;

  return (
    <div className="w-full relative z-10">
      <ReleaseWizard 
        type={release.type === 'ALBUM' ? 'ALBUM' : 'SINGLE'}
        onBack={() => router.push(`/releases/${id}/view`)}
        onSave={() => router.push('/releases')}
        initialData={release}
        userRole={userRole}
        token={token}
      />
    </div>
  );
}
