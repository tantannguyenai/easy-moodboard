import type { BoardItem } from '../OrganicMoodboard';
import { supabase } from './supabase';

export interface SavedMoodboard {
    id: string;
    title: string;
    author: string;
    thumbnail: string; // Base64 data URL
    timestamp: number;
    items: BoardItem[];
    settings: {
        palette: string[];
        background: string;
        bgMode: 'solid' | 'gradient' | 'shader';
        shaderMode: 'soft' | 'extreme';
        layoutMode: 'organic' | 'grid' | 'animate';
        imageRadius: number;
        borderThickness: number;
        showBorders: boolean;
        showGrid: boolean;
        gridType: 'square' | 'dot';
        quoteSize: number;
        enableMotionBlur: boolean;
        motionBlurIntensity: number;
        shaderItemId: string | null;
    };
}

const STORAGE_KEY = 'organic_moodboards_v1';

// check if supabase is configured
const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const saveBoard = async (board: SavedMoodboard): Promise<void> => {
    if (isSupabaseConfigured()) {
        const { error } = await supabase
            .from('moodboards')
            .upsert({
                id: board.id,
                title: board.title,
                author: board.author,
                thumbnail: board.thumbnail,
                data: board, // Store full object in jsonb column
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
    } else {
        // Fallback to LocalStorage
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const boards: SavedMoodboard[] = stored ? JSON.parse(stored) : [];
            const index = boards.findIndex(b => b.id === board.id);
            if (index >= 0) {
                boards[index] = board;
            } else {
                boards.unshift(board);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
        } catch (e) {
            console.error("Local Save Error:", e);
            throw e;
        }
    }
};

export const getBoards = async (): Promise<SavedMoodboard[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase
            .from('moodboards')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Supabase Load Error:", error);
            return [];
        }

        // Map back to SavedMoodboard interface
        // Assuming 'data' column holds the full object, but we also extracted title/author/thumb for easier querying if needed.
        // If we stored the whole object in 'data', we should return that.
        return data.map((row: any) => {
            // If row.data exists, use it, otherwise fallback (if we change schema)
            const board = row.data as SavedMoodboard;
            // Ensure ID matches
            board.id = row.id;
            return board;
        });
    } else {
        // Fallback
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Local Load Error:", e);
            return [];
        }
    }
};

export const getBoard = async (id: string): Promise<SavedMoodboard | undefined> => {
    const boards = await getBoards();
    return boards.find(b => b.id === id);
};

export const deleteBoard = async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        const { error } = await supabase
            .from('moodboards')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            throw error;
        }
    } else {
        // const boards = await getBoards(); // calling local getBoards
        // Wait, getBoards returns array.
        // We need to re-read local storage synchronously or just use the logic
        const stored = localStorage.getItem(STORAGE_KEY);
        const localBoards: SavedMoodboard[] = stored ? JSON.parse(stored) : [];
        const newBoards = localBoards.filter(b => b.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoards));
    }
};
