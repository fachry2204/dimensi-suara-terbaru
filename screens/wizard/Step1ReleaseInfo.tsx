import React, { useState, useEffect } from 'react';
import { ReleaseData } from '@/types';
import { TextInput, SelectInput } from '../../components/Input';
import { LANGUAGES, VERSIONS } from '@/constants';
import { Trash2, Plus, Music } from 'lucide-react';
import { useGenres, useSubGenres } from '@/hooks/useGenres';
import { ChunkUploader } from '../../components/ChunkUploader';
import { api } from '@/utils/api';

const CONTRIBUTOR_ROLES = [
  "Accordion", "Acoustic Guitar", "Alto Saxophone", "Background Vocals", "Banjo", "Bass Guitar", 
  "Bass Saxophone", "Bassoon", "Bells", "Cello", "Choir", "Clarinet", "Conductor", "Double Bass", 
  "Drums", "Ensemble", "Fiddle", "Flugelhorn", "Flute", "Guitar", "Harmonica", "Harp", "Horns", 
  "Keyboards", "Lute", "Oboe", "Orchestra", "Organ", "Percussion", "Piano", "Programmer", "Rap", 
  "Recorder", "Remixer", "Sampled Artist", "Saxophone", "Soprano Saxophone", "Synthesizer", 
  "Tambourine", "Tenor Saxophone", "Trombone", "Trumpet", "Viola", "Viola da gamba", "Violin", 
  "Vocalist", "Whistle", "Xylophone"
];

const PRODUCTION_ROLES = [
  "Assistant Mastering Engineer", "Assistant Mixing Engineer", "Assistant Recording Engineer", 
  "Assistant Sound Engineer", "Co-Producer", "Creative Director", "Editing Engineer", 
  "Graphic Design", "Mastering Engineer", "Mixing Engineer", "Producer", "Recording Engineer", 
  "Studio", "Vocal Design", "Vocal Edited"
];

const WRITER_ROLES = [
  "Adapter", "Arranger", "Orchestrator", "Publisher", "String Arranger", "Translator", "Vocal Director"
];

interface Props {
  data: any;
  updateData: (updates: any) => void;
}

export const Step1ReleaseInfo: React.FC<Props> = ({ data, updateData }) => {
  const { genres, loading: genresLoading } = useGenres();
  const { subgenres, loading: subgenresLoading } = useSubGenres(data.genreId);
  const [userType, setUserType] = useState<string>('Personal');

  useEffect(() => {
    const fetchUserType = async () => {
        try {
            const token = ''; // Get from auth store in real app
            if (token) {
                const profile = await api.getProfile(token);
                setUserType(profile.account_type?.toUpperCase() === 'COMPANY' ? 'Company' : 'Personal');
            }
        } catch (e) {}
    };
    fetchUserType();
  }, []);

  const handleArrayChange = (field: string, index: number, key: string, value: any) => {
    const arr = [...(data[field] || [])];
    let current = arr[index];
    if (typeof current === 'string') {
        current = { name: current };
    }
    arr[index] = { ...current, [key]: value };
    updateData({ [field]: arr });
  };

  const addArrayItem = (field: string, defaultObj: any) => {
    const arr = [...(data[field] || [])];
    arr.push({ ...defaultObj, sequenceNumber: arr.length + 1 });
    updateData({ [field]: arr });
  };

  const removeArrayItem = (field: string, index: number) => {
    const arr = [...(data[field] || [])].filter((_, i) => i !== index);
    const newArr = arr.map((item, i) => {
        if (typeof item === 'string') {
            return { name: item, sequenceNumber: i + 1 };
        }
        return { ...item, sequenceNumber: i + 1 };
    });
    updateData({ [field]: newArr });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Step 1 — New Single Release</h2>
        <p className="text-sm text-slate-600">Complete your single release details</p>
      </div>

      {/* A. Audio File */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">A. Audio File</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChunkUploader 
            label="Master Audio File" 
            accept=".wav,.flac" 
            filePurpose="MASTER_AUDIO"
            required
            onUploadComplete={(id) => updateData({ masterUploadId: id })}
            onRemove={() => updateData({ masterUploadId: null })}
          />
          <ChunkUploader 
            label="Social Media Audio" 
            accept=".wav,.flac" 
            filePurpose="SOCIAL_MEDIA_AUDIO"
            required
            onUploadComplete={(id) => updateData({ socialMediaUploadId: id })}
            onRemove={() => updateData({ socialMediaUploadId: null })}
          />
        </div>
      </div>

      {/* B. Track Information */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">B. Track Information</h3>
        <div className="space-y-4">
          <TextInput 
            label={<>Track / Release Title <span className="text-red-500">*</span></>}
            value={data.title || ''} 
            onChange={(e) => updateData({ title: e.target.value })} 
          />
          <SelectInput 
            label={<>Release Version <span className="text-red-500">*</span></>}
            options={VERSIONS}
            value={data.releaseVersion || 'Original'}
            onChange={(e) => updateData({ releaseVersion: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput 
              label={<>Genre <span className="text-red-500">*</span></>}
              options={genresLoading ? [{label: 'Loading...', value: ''}] : (genres.length === 0 ? [{label: 'No genres found', value: ''}] : genres.map(g => ({ label: g.name, value: g.id })))}
              value={data.genreId || ''}
              onChange={(e) => updateData({ genreId: Number(e.target.value), subgenreId: null })}
              disabled={genresLoading || genres.length === 0}
            />
            <SelectInput 
              label={<>Subgenre <span className="text-red-500">*</span></>}
              options={subgenresLoading ? [{label: 'Loading...', value: ''}] : (data.genreId ? (subgenres.length === 0 ? [{label: 'No subgenres found', value: ''}] : subgenres.map(s => ({ label: s.name, value: s.id }))) : [])}
              value={data.subgenreId || ''}
              onChange={(e) => updateData({ subgenreId: Number(e.target.value) })}
              disabled={!data.genreId || subgenresLoading || (data.genreId && subgenres.length === 0)}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isInstrumental"
              checked={data.isInstrumental || false}
              onChange={(e) => updateData({ isInstrumental: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isInstrumental" className="text-sm font-medium text-slate-700">Instrumental Track?</label>
          </div>
        </div>
      </div>

      {/* C. Artists */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">C. Artists</h3>
        
        {/* Primary Artists */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">Primary Artist(s) <span className="text-red-500">*</span></label>
          {(data.primaryArtists || []).map((artist: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input 
                className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                placeholder="Artist Name" 
                value={artist.name || ''} 
                onChange={(e) => handleArrayChange('primaryArtists', i, 'name', e.target.value)}
              />
              {i > 0 && <button type="button" onClick={() => removeArrayItem('primaryArtists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>}
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('primaryArtists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
            <Plus size={14} className="mr-0.5"/> Add Primary Artist
          </button>
        </div>

        {/* Featured Artists */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Featured Artist(s)</label>
          {(data.featuredArtists || []).map((artist: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input 
                className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                placeholder="Featured Artist Name" 
                value={artist.name || ''} 
                onChange={(e) => handleArrayChange('featuredArtists', i, 'name', e.target.value)}
              />
              <button type="button" onClick={() => removeArrayItem('featuredArtists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('featuredArtists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
            <Plus size={14} className="mr-0.5"/> Add Featured Artist
          </button>
        </div>
      </div>

      {/* D. Writers */}
      <div className="bg-white border border-gray-200 rounded p-6 relative space-y-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-2">D. Writers</h3>
        
        {/* Songwriters */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Songwriter / Composer <span className="text-red-500">*</span></label>
          {(data.songwriters || []).map((s: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Real Name (not band name)" value={s.name || ''} onChange={(e) => handleArrayChange('songwriters', i, 'name', e.target.value)} />
              {i > 0 && <button type="button" onClick={() => removeArrayItem('songwriters', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>}
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('songwriters', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
            <Plus size={14} className="mr-0.5"/> Add Songwriter
          </button>
        </div>

        {/* Lyricists */}
        {!data.isInstrumental && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Lyricists <span className="text-red-500">*</span></label>
            {(data.lyricists || []).map((l: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Name" value={l.name || ''} onChange={(e) => handleArrayChange('lyricists', i, 'name', e.target.value)} />
                <button type="button" onClick={() => removeArrayItem('lyricists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('lyricists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Add Lyricist
            </button>
          </div>
        )}

        {/* Additional Writers */}
        {!data.isInstrumental && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Additional Writers</label>
            {(data.additionalWriters || []).map((a: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select className="w-1/3 border border-gray-300 rounded p-2 text-sm" value={a.roleName || ''} onChange={(e) => handleArrayChange('additionalWriters', i, 'roleName', e.target.value)}>
                  <option value="">Select Role...</option>
                  {WRITER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Name" value={a.name || ''} onChange={(e) => handleArrayChange('additionalWriters', i, 'name', e.target.value)} />
                <button type="button" onClick={() => removeArrayItem('additionalWriters', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('additionalWriters', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Add Additional Writer
            </button>
          </div>
        )}
      </div>

      {/* E. Lyrics Information */}
      {!data.isInstrumental && (
        <div className="bg-white border border-gray-200 rounded p-6 relative">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">E. Lyrics Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput 
                label="Lyrics Language"
                options={LANGUAGES}
                value={data.lyricsLanguage || ''}
                onChange={(e) => updateData({ lyricsLanguage: e.target.value })}
              />
              <SelectInput 
                label="Explicit Content"
                options={[{label: 'No', value: 'NO'}, {label: 'Clean', value: 'CLEAN'}, {label: 'Yes', value: 'YES'}]}
                value={data.explicitType || 'NO'}
                onChange={(e) => updateData({ explicitType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Lyrics</label>
              <textarea 
                className="w-full border border-gray-300 rounded p-3 text-sm min-h-[220px]"
                value={data.lyrics || ''}
                onChange={(e) => updateData({ lyrics: e.target.value })}
                placeholder="Paste lyrics here..."
              />
            </div>
          </div>
        </div>
      )}



      {/* F. Credits */}
      <div className="bg-white border border-gray-200 rounded p-6 relative space-y-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-2">F. Credits</h3>
        
        {/* Production */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Production & Additional Production <span className="text-red-500">*</span></label>
          {(data.productionCredits || []).map((p: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className="w-1/3 border border-gray-300 rounded p-2 text-sm" value={p.roleName || ''} onChange={(e) => handleArrayChange('productionCredits', i, 'roleName', e.target.value)}>
                <option value="">Select Role...</option>
                {PRODUCTION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Name" value={p.name || ''} onChange={(e) => handleArrayChange('productionCredits', i, 'name', e.target.value)} />
              <button type="button" onClick={() => removeArrayItem('productionCredits', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('productionCredits', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
            <Plus size={14} className="mr-0.5"/> Add Production
          </button>
        </div>

        {/* Contributors */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Contributors</label>
          {(data.contributors || []).map((c: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className="w-1/3 border border-gray-300 rounded p-2 text-sm" value={c.roleName || ''} onChange={(e) => handleArrayChange('contributors', i, 'roleName', e.target.value)}>
                <option value="">Select Role...</option>
                {CONTRIBUTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Name" value={c.name || ''} onChange={(e) => handleArrayChange('contributors', i, 'name', e.target.value)} />
              <button type="button" onClick={() => removeArrayItem('contributors', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('contributors', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
            <Plus size={14} className="mr-0.5"/> Add Contributor
          </button>
        </div>
      </div>

      {/* G. Record Label (Company Only) */}
      {userType === 'Company' && (
        <div className="bg-white border border-gray-200 rounded p-6 relative">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">G. Label</h3>
          <TextInput 
            label="Record Label"
            value={data.label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Company Label Name"
          />
        </div>
      )}
    </div>
  );
};
