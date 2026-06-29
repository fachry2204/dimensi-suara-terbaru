import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface ChunkUploaderProps {
  label: string;
  accept: string;
  filePurpose: 'MASTER_AUDIO' | 'SOCIAL_MEDIA_AUDIO';
  onUploadComplete: (uploadId: string) => void;
  onRemove: () => void;
  required?: boolean;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ChunkUploader: React.FC<ChunkUploaderProps> = ({ 
  label, accept, filePurpose, onUploadComplete, onRemove, required 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'VALIDATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = async () => {
    if (uploadId) {
      try {
        await fetch(`/api/uploads/${uploadId}`, { method: 'DELETE' });
      } catch (e) {}
    }
    setFile(null);
    setProgress(0);
    setUploadId(null);
    setStatus('IDLE');
    setErrorMessage('');
    setDuration(null);
    onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (selectedFile: File) => {
    // Client-side duration check for early feedback
    if (filePurpose === 'SOCIAL_MEDIA_AUDIO') {
      const audio = new Audio(URL.createObjectURL(selectedFile));
      audio.onloadedmetadata = async () => {
        const d = audio.duration;
        if (d < 30 || d > 60) {
          Swal.fire({
            title: 'Durasi Tidak Sesuai',
            text: `Durasi file sosial media harus antara 30 hingga 60 detik. File Anda berdurasi ${Math.round(d)} detik.`,
            icon: 'error',
            confirmButtonColor: '#3085d6'
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
          return; // Abort upload
        }
        await startUpload(selectedFile);
      };
      audio.onerror = () => {
        // If client check fails, fallback to server check
        startUpload(selectedFile);
      };
    } else {
      await startUpload(selectedFile);
    }
  };

  const startUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('UPLOADING');
    setErrorMessage('');
    setProgress(0);
    setDuration(null);

    const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);

    try {
      // 1. Init upload
      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePurpose,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          totalChunks
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) throw new Error(initData.message || 'Gagal inisialisasi upload');
      
      const currentUploadId = initData.uploadId;
      setUploadId(currentUploadId);

      // 2. Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const formData = new FormData();
        formData.append('chunkIndex', i.toString());
        formData.append('chunk', chunk);

        const chunkRes = await fetch(`/api/uploads/${currentUploadId}/chunk`, {
          method: 'POST',
          body: formData
        });

        if (!chunkRes.ok) throw new Error('Gagal mengupload bagian file');
        
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // 3. Complete and Validate
      setStatus('VALIDATING');
      const completeRes = await fetch(`/api/uploads/${currentUploadId}/complete`, {
        method: 'POST'
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.message || 'File tidak valid');
      }

      setDuration(completeData.data?.duration || null);
      setStatus('SUCCESS');
      onUploadComplete(currentUploadId);

    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setErrorMessage(err.message || 'Terjadi kesalahan saat upload');
      Swal.fire({
        title: 'Upload Gagal',
        text: err.message || 'Terjadi kesalahan saat upload',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="border border-slate-200 rounded p-4 bg-white relative">
      <div className="flex justify-between items-start mb-2">
        <label className="text-sm font-bold text-slate-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {filePurpose === 'SOCIAL_MEDIA_AUDIO' && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">30-60 detik</span>
        )}
      </div>

      {status === 'IDLE' && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-colors"
        >
          <Upload className="text-slate-400 mb-2" size={24} />
          <p className="text-sm text-slate-600 font-medium">Klik untuk memilih file</p>
          <p className="text-xs text-slate-400 mt-1">WAV atau FLAC (Minimal 16-bit)</p>
        </div>
      )}

      {(status === 'UPLOADING' || status === 'VALIDATING') && (
        <div className="w-full border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 truncate mr-4">{file?.name}</span>
            <span className="text-xs font-bold text-blue-600">
              {status === 'VALIDATING' ? 'Validasi...' : `${progress}%`}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${status === 'VALIDATING' ? 'bg-indigo-500 animate-pulse w-full' : 'bg-blue-500'}`}
              style={{ width: status === 'VALIDATING' ? '100%' : `${progress}%` }}
            ></div>
          </div>
          {status === 'VALIDATING' && (
            <p className="text-xs text-slate-500 mt-2 flex items-center">
              <Loader2 size={12} className="animate-spin mr-1" />
              Mengecek format, durasi, dan bit-depth...
            </p>
          )}
        </div>
      )}

      {status === 'SUCCESS' && (
        <div className="w-full border border-green-200 rounded-lg p-4 bg-green-50 flex flex-col gap-2 relative">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-2" size={20} />
            <div className="truncate flex-1">
              <p className="text-sm font-medium text-green-800 truncate pr-6">{file?.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded font-medium">Berhasil diverifikasi</span>
                {duration && (
                  <span className="text-xs text-green-700 bg-green-200/50 border border-green-200 px-2 py-0.5 rounded font-semibold tracking-wide">
                    ⏱ {formatDuration(duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={reset}
            className="absolute top-4 right-4 p-1.5 bg-white text-slate-500 rounded-md shadow-sm border border-slate-200 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="w-full border border-red-200 rounded-lg p-4 bg-red-50 flex flex-col items-start relative">
          <button 
            type="button"
            onClick={reset}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
          <div className="flex items-center text-red-600 mb-1">
            <AlertCircle size={18} className="mr-1.5" />
            <span className="text-sm font-bold">Gagal</span>
          </div>
          <p className="text-xs text-red-600">{errorMessage}</p>
          <button 
            type="button"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className="mt-3 text-xs font-medium bg-white px-3 py-1.5 border border-red-200 rounded text-red-600 hover:bg-red-50 shadow-sm"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />
    </div>
  );
};
