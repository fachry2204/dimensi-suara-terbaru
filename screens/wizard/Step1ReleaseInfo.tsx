import React, { useState, useEffect } from 'react';
import { ReleaseData, ReleaseType } from '@/types';
import { TextInput, SelectInput } from '../../components/Input';
import { LANGUAGES, VERSIONS } from '@/constants';
import { Calendar, Trash2, Plus, Music } from 'lucide-react';
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
  releaseType?: ReleaseType;
  coverArtUploader?: React.ReactNode;
  userRole?: string;
}

export const Step1ReleaseInfo: React.FC<Props> = ({ data, updateData, releaseType = 'SINGLE', coverArtUploader, userRole }) => {
  const { genres, loading: genresLoading } = useGenres();
  const { subgenres, loading: subgenresLoading } = useSubGenres(data.genreId);
  const [userType, setUserType] = useState<string>('Personal');
  const originalDateInputRef = React.useRef<HTMLInputElement>(null);
  const isAdmin = String(userRole || '').toLowerCase() === 'admin';
  const isInstrumentalChecked =
    data.isInstrumental === true ||
    data.isInstrumental === 1 ||
    ['1', 'yes', 'true'].includes(String(data.isInstrumental ?? '').trim().toLowerCase());

  useEffect(() => {
    const fetchUserType = async () => {
        try {
            const token = typeof window !== 'undefined' ? (localStorage.getItem('cms_token') || '') : '';
            if (token) {
                const profile = await api.getProfile(token);
                setUserType(profile.account_type?.toUpperCase() === 'COMPANY' ? 'Company' : 'Personal');
            }
        } catch (e) {}
    };
    fetchUserType();
  }, []);

  // Initialize default values so validation doesn't fail for untouched fields
  useEffect(() => {
    const updates: any = {};
    if (!data.releaseVersion && !data.version) {
      updates.releaseVersion = 'Original';
      updates.version = 'Original';
    }
    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="w-full max-w-none space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Step 1 - New {releaseType === 'ALBUM' ? 'Album' : 'Single'} Release</h2>
        <p className="text-sm text-slate-600">Complete your {releaseType === 'ALBUM' ? 'album' : 'single'} release details</p>
      </div>
      <div className="hidden">
        <h2 className="text-xl font-bold text-slate-900">Step 1 — New Single Release</h2>
        <p className="text-sm text-slate-600">Complete your single release details</p>
      </div>

      {coverArtUploader}

      {/* A. Audio File */}
      {releaseType === 'SINGLE' && (
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">A. File Audio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChunkUploader 
            label="File Audio Master" 
            accept=".wav,.flac" 
            filePurpose="MASTER_AUDIO"
            required={!isAdmin}
            existingUploadId={data.masterUploadId || null}
            onUploadComplete={(id) => updateData({ masterUploadId: id })}
            onRemove={() => updateData({ masterUploadId: null })}
          />
          <ChunkUploader 
            label="Audio Media Sosial" 
            accept=".wav,.flac" 
            filePurpose="SOCIAL_MEDIA_AUDIO"
            required={!isAdmin}
            existingUploadId={data.socialMediaUploadId || null}
            onUploadComplete={(id) => updateData({ socialMediaUploadId: id })}
            onRemove={() => updateData({ socialMediaUploadId: null })}
          />
        </div>
      </div>
      )}

      {/* B. Track / Album Information */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">
          B. {releaseType === 'ALBUM' ? 'Informasi Album' : 'Informasi Track'}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput 
              label={<>{releaseType === 'ALBUM' ? 'Judul Album' : 'Judul Track / Rilis'} <span className="text-red-500">*</span></>}
              value={data.title || ''} 
              onChange={(e) => updateData({ title: e.target.value })} 
            />
            <SelectInput 
              label={<>Versi Rilis <span className="text-red-500">*</span></>}
              options={VERSIONS}
              value={data.releaseVersion || 'Original'}
              onChange={(e) => updateData({ releaseVersion: e.target.value, version: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput 
              label={<>Genre <span className="text-red-500">*</span></>}
              options={genresLoading ? [{label: 'Memuat...', value: ''}] : (genres.length === 0 ? [{label: 'Genre tidak ditemukan', value: ''}] : genres.map(g => ({ label: g.name, value: g.id })))}
              value={data.genreId || ''}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const selectedGenre = genres.find(g => g.id === selectedId);
                updateData({ genreId: selectedId, genre: selectedGenre?.name || '', subgenreId: null, subGenre: '' });
              }}
              disabled={genresLoading || genres.length === 0}
            />
            <SelectInput 
              label={<>Subgenre <span className="text-red-500">*</span></>}
              options={subgenresLoading ? [{label: 'Memuat...', value: ''}] : (data.genreId ? (subgenres.length === 0 ? [{label: 'Subgenre tidak ditemukan', value: ''}] : subgenres.map(s => ({ label: s.name, value: s.id }))) : [])}
              value={data.subgenreId || ''}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const selectedSubgenre = subgenres.find(s => s.id === selectedId);
                updateData({ subgenreId: selectedId, subGenre: selectedSubgenre?.name || '' });
              }}
              disabled={!data.genreId || subgenresLoading || (data.genreId && subgenres.length === 0)}
            />
          </div>
          {releaseType === 'SINGLE' && (
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isInstrumental"
              checked={isInstrumentalChecked}
              onChange={(e) => updateData({ isInstrumental: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isInstrumental" className="text-sm font-medium text-slate-700">Track Instrumental?</label>
          </div>
          )}
        </div>
      </div>

      {releaseType === 'ALBUM' && (
        <div className="bg-white border border-gray-200 rounded p-6 relative">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-3 left-4 bg-white px-2">Riwayat Distribusi</h3>

          <div className="space-y-4">
            <label className={`flex items-center p-4 rounded-lg border cursor-pointer select-none transition-all ${data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
              <div
                style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', borderRadius: '50%' }}
                className={`border flex items-center justify-center mr-4 shrink-0 pointer-events-none ${data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}
              >
                {data.isNewRelease && <div style={{ width: '10px', height: '10px', borderRadius: '50%' }} className="bg-blue-500 pointer-events-none" />}
              </div>
              <input
                type="radio"
                name="albumDistributionHistory"
                checked={data.isNewRelease === true}
                onChange={() => updateData({ isNewRelease: true, upc: '', originalReleaseDate: '' })}
                className="hidden"
              />
              <span className={`text-xs font-medium select-none ${data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>Tidak, ini rilis baru</span>
            </label>

            <label className={`flex items-center p-4 rounded-lg border cursor-pointer select-none transition-all ${data.isNewRelease === false ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
              <div
                style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', borderRadius: '50%' }}
                className={`border flex items-center justify-center mr-4 shrink-0 pointer-events-none ${data.isNewRelease === false ? 'border-blue-500' : 'border-gray-300'}`}
              >
                {data.isNewRelease === false && <div style={{ width: '10px', height: '10px', borderRadius: '50%' }} className="bg-blue-500 pointer-events-none" />}
              </div>
              <input
                type="radio"
                name="albumDistributionHistory"
                checked={data.isNewRelease === false}
                onChange={() => updateData({ isNewRelease: false })}
                className="hidden"
              />
              <span className={`text-xs font-medium select-none ${data.isNewRelease === false ? 'text-blue-900' : 'text-slate-600'}`}>Ya, album ini pernah dirilis sebelumnya</span>
            </label>
          </div>

          {data.isNewRelease === false && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">Tanggal Rilis Asli</label>
                <div className="relative group">
                  <input
                    ref={originalDateInputRef}
                    type="date"
                    value={data.originalReleaseDate || ''}
                    onChange={(e) => updateData({ originalReleaseDate: e.target.value })}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="w-full px-4 py-2 text-sm text-black border border-gray-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 font-sans font-semibold cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => originalDateInputRef.current?.showPicker()}
                    className="absolute right-2 top-1 bottom-1 aspect-square rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm border bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100"
                  >
                    <Calendar size={16} />
                  </button>
                </div>
              </div>

              <TextInput
                label="UPC Code (Jika album sudah pernah rilis)"
                value={data.upc || ''}
                onChange={(e) => updateData({ upc: e.target.value })}
                placeholder="Masukkan kode UPC sebelumnya"
              />
            </div>
          )}
        </div>
      )}

      {/* C. Artists */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">C. Artis</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Artists */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Artis Utama <span className="text-red-500">*</span></label>
            {(data.primaryArtists || []).map((artist: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input 
                  className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                  placeholder="Nama Artis" 
                  value={typeof artist === 'string' ? artist : artist.name || ''} 
                  onChange={(e) => handleArrayChange('primaryArtists', i, 'name', e.target.value)}
                />
                {i > 0 && <button type="button" onClick={() => removeArrayItem('primaryArtists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>}
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('primaryArtists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Tambah Artis Utama
            </button>
          </div>

          {/* Featured Artists */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Artis Featuring</label>
            {(data.featuredArtists || []).map((artist: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input 
                  className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                  placeholder="Nama Artis Featuring" 
                  value={typeof artist === 'string' ? artist : artist.name || ''} 
                  onChange={(e) => handleArrayChange('featuredArtists', i, 'name', e.target.value)}
                />
                <button type="button" onClick={() => removeArrayItem('featuredArtists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('featuredArtists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Tambah Artis Featuring
            </button>
          </div>
        </div>
      </div>

      {releaseType === 'SINGLE' && (
      <>
      {/* D. Credits */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-2">D. Kredit</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Production */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Produksi & Produksi Tambahan <span className="text-red-500">*</span></label>
            {(data.productionCredits || []).map((p: any, i: number) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 mb-2 items-center">
                <select className="min-w-0 border border-gray-300 rounded p-2 text-sm" value={p.roleName || ''} onChange={(e) => handleArrayChange('productionCredits', i, 'roleName', e.target.value)}>
                  <option value="">Pilih Peran...</option>
                  {PRODUCTION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input className="min-w-0 border border-gray-300 rounded p-2 text-sm" placeholder="Nama" value={p.name || ''} onChange={(e) => handleArrayChange('productionCredits', i, 'name', e.target.value)} />
                <button type="button" onClick={() => removeArrayItem('productionCredits', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('productionCredits', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Tambah Produksi
            </button>
          </div>

          {/* Contributors */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Kontributor</label>
            {(data.contributors || []).map((c: any, i: number) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 mb-2 items-center">
                <select className="min-w-0 border border-gray-300 rounded p-2 text-sm" value={c.roleName || ''} onChange={(e) => handleArrayChange('contributors', i, 'roleName', e.target.value)}>
                  <option value="">Pilih Peran...</option>
                  {CONTRIBUTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input className="min-w-0 border border-gray-300 rounded p-2 text-sm" placeholder="Nama" value={c.name || ''} onChange={(e) => handleArrayChange('contributors', i, 'name', e.target.value)} />
                <button type="button" onClick={() => removeArrayItem('contributors', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('contributors', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Tambah Kontributor
            </button>
          </div>
        </div>
      </div>

      {/* E. Writers */}
      <div className="bg-white border border-gray-200 rounded p-6 relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-2">E. Penulis</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Songwriters */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Songwriter / Komposer <span className="text-red-500">*</span></label>
            {(data.songwriters || []).map((s: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Nama asli (bukan nama band)" value={s.name || ''} onChange={(e) => handleArrayChange('songwriters', i, 'name', e.target.value)} />
                {i > 0 && <button type="button" onClick={() => removeArrayItem('songwriters', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>}
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('songwriters', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
              <Plus size={14} className="mr-0.5"/> Tambah Songwriter
            </button>
          </div>

          {/* Lyricists */}
          {!isInstrumentalChecked && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Penulis Lirik <span className="text-red-500">*</span></label>
              {(data.lyricists || []).map((l: any, i: number) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input className="flex-1 border border-gray-300 rounded p-2 text-sm" placeholder="Nama" value={l.name || ''} onChange={(e) => handleArrayChange('lyricists', i, 'name', e.target.value)} />
                  <button type="button" onClick={() => removeArrayItem('lyricists', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('lyricists', {name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
                <Plus size={14} className="mr-0.5"/> Tambah Penulis Lirik
              </button>
            </div>
          )}

          {/* Additional Writers */}
          {!isInstrumentalChecked && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Penulis Tambahan</label>
              {(data.additionalWriters || []).map((a: any, i: number) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-2 mb-2 items-center">
                  <select className="min-w-0 border border-gray-300 rounded p-2 text-sm" value={a.roleName || ''} onChange={(e) => handleArrayChange('additionalWriters', i, 'roleName', e.target.value)}>
                    <option value="">Pilih Peran...</option>
                    {WRITER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input className="min-w-0 border border-gray-300 rounded p-2 text-sm" placeholder="Nama" value={a.name || ''} onChange={(e) => handleArrayChange('additionalWriters', i, 'name', e.target.value)} />
                  <button type="button" onClick={() => removeArrayItem('additionalWriters', i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('additionalWriters', {roleName: '', name: ''})} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all duration-150 shadow-sm w-fit">
                <Plus size={14} className="mr-0.5"/> Tambah Penulis Tambahan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* F. Lyrics Information */}
      {!isInstrumentalChecked && (
        <div className="bg-white border border-gray-200 rounded p-6 relative">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">F. Informasi Lirik</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput 
                label={<>Bahasa Lirik <span className="text-red-500">*</span></>}
                options={LANGUAGES}
                value={data.lyricsLanguage || ''}
                onChange={(e) => updateData({ lyricsLanguage: e.target.value, language: e.target.value })}
              />
              <SelectInput 
                label="Konten Eksplisit"
                options={[{label: 'Tidak', value: 'NO'}, {label: 'Bersih', value: 'CLEAN'}, {label: 'Ya', value: 'YES'}]}
                value={data.explicitType || 'NO'}
                onChange={(e) => updateData({ explicitType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Lirik</label>
              <textarea 
                className="w-full border border-gray-300 rounded p-3 text-sm min-h-[220px]"
                value={data.lyrics || ''}
                onChange={(e) => updateData({ lyrics: e.target.value })}
                placeholder="Tempel lirik di sini..."
              />
            </div>
          </div>
        </div>
      )}
      {/* G. Record Label (Company Only) */}
      {userType === 'Company' && (
        <div className="bg-white border border-gray-200 rounded p-6 relative">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">G. Label</h3>
          <TextInput 
            label="Label Rekaman"
            value={data.label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Nama Label Perusahaan"
          />
        </div>
      )}
      </>
      )}
    </div>
  );
};
