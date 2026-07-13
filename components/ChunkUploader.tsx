import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { assetUrl } from '@/utils/url';

interface ChunkUploaderProps {
  label: string;
  accept: string;
  filePurpose: 'MASTER_AUDIO' | 'SOCIAL_MEDIA_AUDIO';
  onUploadComplete: (uploadId: string) => void;
  onRemove: () => void;
  required?: boolean;
  /** Pass the already-uploaded ID so state is restored when navigating back between wizard steps */
  existingUploadId?: string | null;
  /** Existing persisted file path/URL from an already-saved release. */
  existingFileRef?: string | null;
}

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks for proxy stability

function createUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const readJsonResponse = async (res: Response, endpoint?: string) => {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
    const message = isHtml
      ? `Server mengembalikan halaman error (${res.status})${endpoint ? ` pada ${endpoint}` : ''}. Silakan ulangi upload.`
      : text.slice(0, 200);
    throw new Error(message);
  }
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getExistingFileName(ref?: string | null) {
  if (!ref) return '';
  const clean = ref.split('?')[0].split('#')[0];
  const name = clean.split('/').filter(Boolean).pop() || ref;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export const ChunkUploader: React.FC<ChunkUploaderProps> = ({ 
  label, accept, filePurpose, onUploadComplete, onRemove, required, existingUploadId, existingFileRef
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(existingUploadId || null);
  const [existingRef, setExistingRef] = useState<string | null>(existingFileRef || null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'VALIDATING' | 'SUCCESS' | 'ERROR'>(
    existingUploadId || existingFileRef ? 'SUCCESS' : 'IDLE'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore SUCCESS state if parent still holds an uploadId (e.g., user navigated back)
  useEffect(() => {
    if ((existingUploadId || existingFileRef) && status === 'IDLE') {
      setUploadId(existingUploadId);
      setExistingRef(existingFileRef || null);
      setStatus('SUCCESS');
    }
  }, [existingUploadId, existingFileRef, status]);

  const reset = async () => {
    if (uploadId) {
      try {
        await fetch(`/api/uploads/${uploadId}`, { method: 'DELETE' });
      } catch (e) {}
    }
    setFile(null);
    setProgress(0);
    setUploadId(null);
    setExistingRef(null);
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
            title: 'Invalid Duration',
            text: `Social media audio duration must be between 30 and 60 seconds. Your file is ${Math.round(d)} seconds.`,
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
      const currentUploadId = createUploadId();
      setUploadId(currentUploadId);
      let completeData: any = null;

      // 1. Upload chunks. The server creates the upload session on the first chunk.
      for (let i = 0; i < totalChunks; i++) {
        // Delay 100ms antar chunk untuk mencegah kemacetan socket/proxy pada server lokal
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const formData = new FormData();
        formData.append('data', JSON.stringify({
          releaseUploadMode: true,
          uploadId: currentUploadId,
          chunkIndex: i,
          totalChunks,
          filename: selectedFile.name,
          filePurpose,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type
        }));
        formData.append('chunk', chunk, selectedFile.name);

        const chunkEndpoint = '/api/releases/upload-tmp-chunk';
        const chunkRes = await fetch(chunkEndpoint, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        let chunkData: any = null;
        if (!chunkRes.ok) {
          let errMsg = 'Terjadi kesalahan saat upload, silakan ulangi.';
          try {
            const errData = await readJsonResponse(chunkRes, chunkEndpoint);
            if (errData && errData.message) {
              errMsg = `${errData.message}. Silakan ulangi.`;
            } else if (errData && errData.error) {
              errMsg = `${errData.error}. Silakan ulangi.`;
            }
          } catch (jsonErr: any) {
            errMsg = jsonErr.message || errMsg;
          }
          throw new Error(errMsg);
        }

        chunkData = await readJsonResponse(chunkRes, chunkEndpoint);
        if (chunkData.done) {
          completeData = chunkData;
        }
        
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // 3. Validate completed data from the last chunk
      setStatus('VALIDATING');
      if (!completeData || !completeData.success) {
        throw new Error(completeData?.message || 'File tidak valid atau rusak');
      }

      setDuration(completeData.data?.duration || null);
      setExistingRef(null);
      setStatus('SUCCESS');
      onUploadComplete(currentUploadId);

    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Terjadi kesalahan saat upload, silakan ulangi.');
      Swal.fire({
        title: 'Upload Gagal',
        text: err.message || 'Terjadi kesalahan saat upload, silakan ulangi.',
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
    <div className="border border-slate-200 rounded p-3 bg-white relative">
      <div className="flex justify-between items-start mb-1.5">
        <label className="text-sm font-bold text-slate-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {filePurpose === 'SOCIAL_MEDIA_AUDIO' && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">30-60 seconds</span>
        )}
      </div>

      {status === 'IDLE' && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[104px] border-2 border-dashed border-slate-300 rounded-lg px-4 py-4 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-colors"
        >
          <Upload className="text-slate-400 mb-1.5" size={20} />
          <p className="text-sm text-slate-600 font-medium">Click to select file</p>
          <p className="text-xs text-slate-400 mt-0.5">WAV or FLAC (Minimum 16-bit)</p>
        </div>
      )}

      {(status === 'UPLOADING' || status === 'VALIDATING') && (
        <div className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 truncate mr-4">{file?.name}</span>
            <span className="text-xs font-bold text-blue-600">
              {status === 'VALIDATING' ? 'Validating...' : `${progress}%`}
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
              Checking format, duration, and bit-depth...
            </p>
          )}
        </div>
      )}

      {status === 'SUCCESS' && (
        <div className="w-full border border-green-200 rounded-lg p-3 bg-green-50 flex flex-col gap-2 relative">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-2" size={20} />
            <div className="truncate flex-1">
              <p className="text-sm font-medium text-green-800 truncate pr-6">
                {file?.name || getExistingFileName(existingRef || uploadId) || `File uploaded (ID: ${uploadId?.slice(0, 8)}...)`}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded font-medium">✓ Uploaded &amp; verified</span>
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
            className="absolute top-3 right-3 p-1.5 bg-white text-slate-500 rounded-md shadow-sm border border-slate-200 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <X size={16} />
          </button>
          {/* Audio Preview */}
          {(file || existingRef || (uploadId && typeof uploadId === 'string')) && (
            <div className="mt-2 w-full pr-10">
              <audio 
                controls 
                className="w-full h-8 outline-none" 
                controlsList="nodownload"
                src={file ? URL.createObjectURL(file) : assetUrl((existingRef || uploadId) as string)} 
              />
            </div>
          )}
        </div>
      )}

      {status === 'ERROR' && (
        <div className="w-full border border-red-200 rounded-lg p-3 bg-red-50 flex flex-col items-start relative">
          <button 
            type="button"
            onClick={reset}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
          <div className="flex items-center text-red-600 mb-1">
            <AlertCircle size={18} className="mr-1.5" />
            <span className="text-sm font-bold">Upload Gagal</span>
          </div>
          <p className="text-xs text-red-600">{errorMessage}</p>
          <button 
            type="button"
            onClick={async () => {
              await reset();
              setTimeout(() => {
                fileInputRef.current?.click();
              }, 100);
            }}
            className="mt-3 text-xs font-medium bg-white px-3 py-1.5 border border-red-200 rounded text-red-600 hover:bg-red-50 shadow-sm"
          >
            Ulangi Upload
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
