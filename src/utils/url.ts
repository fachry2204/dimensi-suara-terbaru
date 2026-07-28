export const assetUrl = (p?: string | null): string => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const normalized = p.startsWith('/') ? p : `/${p}`;
  
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');
  
  // Serve uploads from API base if available
  if (/^\/uploads\//.test(normalized)) {
    if (apiBase && apiBase.startsWith('http')) {
      return `${apiBase}${normalized}`;
    }
    try {
      const origin = (globalThis as any)?.location?.origin || '';
      if (origin) return `${origin}${normalized}`;
    } catch {}
  }

  const base = (apiBase || (globalThis as any)?.location?.origin || '/api').replace(/\/api$/, '');
  return `${base}${normalized}`;
};

export const publicAssetUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, '');
  // Prefer runtime base from document for subpath deployments
  try {
    const baseUri = (globalThis as any)?.document?.baseURI;
    if (baseUri) {
      return new URL(normalized, baseUri).toString();
    }
  } catch {}
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '/').replace(/\/+$/, '');
  return `${base}/${normalized}`;
};

export const releaseFilePreviewUrl = (filePath?: string | null): string => {
  if (!filePath) return '';

  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  if (!normalized.includes('/uploads/')) return assetUrl(filePath);

  const relativePath = `/uploads/${normalized.split('/uploads/')[1]}`;
  const params = new URLSearchParams({
    filePath: relativePath,
    inline: '1',
  });
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');
  return `${apiBase}/releases/download?${params.toString()}`;
};
