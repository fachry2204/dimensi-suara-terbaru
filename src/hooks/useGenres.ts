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

export function useGenres() {
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                console.log("Fetching genres from:", `${API_BASE_URL}/genres`);
                const response = await fetch(`${API_BASE_URL}/genres`);
                console.log("Genres response status:", response.status);
                const json = await response.json();
                console.log("Genres JSON:", json);
                if (json.success) {
                    setGenres(json.data);
                } else {
                    console.error("Genres fetch not successful:", json);
                }
            } catch (err) {
                console.error("Failed to fetch genres", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGenres();
    }, []);

    return { genres, loading };
}

export function useSubGenres(genreId?: number | string) {
    const [subgenres, setSubgenres] = useState<SubGenre[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!genreId) {
            setSubgenres([]);
            return;
        }

        const fetchSubGenres = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/genres/${genreId}/subgenres`);
                const json = await response.json();
                if (json.success) {
                    setSubgenres(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch subgenres", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubGenres();
    }, [genreId]);

    return { subgenres, loading };
}
