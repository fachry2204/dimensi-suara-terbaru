import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/utils/api';

export interface Genre {
    id: number;
    name: string;
    slug: string;
}

export interface SubGenre {
    id: number;
    genre_id: number;
    name: string;
    slug: string;
}

let genresCache: Genre[] | null = null;
let genresPromise: Promise<Genre[]> | null = null;
const subgenresCache = new Map<string, SubGenre[]>();
const subgenresPromiseCache = new Map<string, Promise<SubGenre[]>>();

export function useGenres() {
    const [genres, setGenres] = useState<Genre[]>(genresCache || []);
    const [loading, setLoading] = useState(!genresCache);

    useEffect(() => {
        let isMounted = true;

        const fetchGenres = async () => {
            if (genresCache) {
                setGenres(genresCache);
                setLoading(false);
                return;
            }

            try {
                genresPromise = genresPromise || fetch(`${API_BASE_URL}/genres`)
                    .then(response => response.json())
                    .then(json => {
                        if (!json.success) {
                            console.error("Genres fetch not successful:", json);
                            return [];
                        }
                        genresCache = json.data;
                        return json.data;
                    });

                const data = await genresPromise;
                if (isMounted) setGenres(data);
            } catch (err) {
                console.error("Failed to fetch genres", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchGenres();

        return () => {
            isMounted = false;
        };
    }, []);

    return { genres, loading };
}

export function useSubGenres(genreId?: number | string) {
    const cacheKey = genreId ? String(genreId) : '';
    const [subgenres, setSubgenres] = useState<SubGenre[]>(cacheKey ? (subgenresCache.get(cacheKey) || []) : []);
    const [loading, setLoading] = useState(Boolean(cacheKey) && !subgenresCache.has(cacheKey));

    useEffect(() => {
        let isMounted = true;

        if (!cacheKey) {
            setSubgenres([]);
            setLoading(false);
            return;
        }

        const fetchSubGenres = async () => {
            if (subgenresCache.has(cacheKey)) {
                setSubgenres(subgenresCache.get(cacheKey) || []);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const pending = subgenresPromiseCache.get(cacheKey) || fetch(`${API_BASE_URL}/genres/${cacheKey}/subgenres`)
                    .then(response => response.json())
                    .then(json => {
                        const data = json.success ? json.data : [];
                        subgenresCache.set(cacheKey, data);
                        subgenresPromiseCache.delete(cacheKey);
                        return data;
                    });

                subgenresPromiseCache.set(cacheKey, pending);
                const data = await pending;
                if (isMounted) setSubgenres(data);
            } catch (err) {
                console.error("Failed to fetch subgenres", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchSubGenres();

        return () => {
            isMounted = false;
        };
    }, [cacheKey]);

    return { subgenres, loading };
}
