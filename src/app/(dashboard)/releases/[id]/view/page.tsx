"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ReleaseData } from '@/types';
import { api } from '@/utils/api';
import { ReleaseDetailModal } from '../../../../../../components/ReleaseDetailModal';
import { AlertModal } from '../../../../../../components/AlertModal';

export default function ReleaseDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  const [userRole, setUserRole] = useState('Admin'); // Placeholder, can be synced with real auth
  const token = ''; // Handled implicitly by Next.js rewrites/cookies
  const [aggregators, setAggregators] = useState<string[]>([]);

  useEffect(() => {
    const fetchAggregators = async () => {
      try {
        const res = await api.getAggregators(token);
        if (res.aggregators) setAggregators(res.aggregators);
      } catch (e) {
        console.warn('Failed to load aggregators');
      }
    };
    fetchAggregators();
  }, [token]);

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

        console.log("RAW RELEASE DATA =>", JSON.stringify(raw, null, 2));
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
              isInstrumental: undefined,
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
          isNewRelease: raw.original_release_date ? false : true,
          originalReleaseDate: raw.original_release_date || '',
          plannedReleaseDate: raw.planned_release_date || '',
          preReleaseSocialMedia: raw.pre_release_social_media || raw.preReleaseSocialMedia || '',
          preReleaseYoutubeMusic: raw.pre_release_youtube_music || raw.preReleaseYoutubeMusic || '',
          rejectionReason: raw.rejection_reason || '',
          rejectionDescription: raw.rejection_description || ''
        };
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
    <>
      <ReleaseDetailModal 
        release={release}
        isOpen={true}
        onClose={() => router.push('/releases')}
        onUpdate={async (r) => {
          try {
            await api.updateReleaseWorkflow(token, r);
            router.push('/releases');
          } catch (e: any) {
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: e?.message || 'Gagal menyimpan status release',
                type: 'error'
            });
          }
        }}
        availableAggregators={aggregators}
        mode="view"
        onEdit={(r) => {
          router.push(`/releases/${r.id}/edit`);
        }}
        onDelete={async (r) => {
            if (!confirm('Are you sure you want to delete this release?')) return;
            try {
                await api.deleteRelease(token, r.id!);
                router.push('/releases');
            } catch (e: any) {
                setAlertState({
                    isOpen: true,
                    title: 'Error',
                    message: e?.message || 'Gagal menghapus release',
                    type: 'error'
                });
            }
        }}
        userRole={userRole}
        token={token}
        onCoverArtUpdated={(newUrl) => {
             setRelease(prev => prev ? ({ 
                 ...prev, 
                 coverArt: newUrl, 
                 status: userRole !== 'Admin' ? 'Request Edit' : prev.status 
             }) : null);
             if (userRole !== 'Admin') {
                 setAlertState({
                     isOpen: true,
                     title: 'Cover Art Updated',
                     message: 'Cover art updated. Status changed to Request Edit.',
                     type: 'success'
                 });
             }
        }}
      />
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
