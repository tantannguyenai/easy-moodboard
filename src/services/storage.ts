import type { BoardItem } from '../OrganicMoodboard';
import { supabase } from './supabase';
import { nanoid } from 'nanoid';

export interface SavedMoodboard {
    id: string;
    title: string;
    author: string;
    thumbnail: string; // Base64 data URL
    timestamp: number;
    items: BoardItem[];
    collab?: {
        roomId: string;
        shareToken: string;
        access: 'public_edit_link';
        createdAt: number;
        expiresAt?: number;
    };
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

const readLocalBoards = (): SavedMoodboard[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored) as SavedMoodboard[];
    } catch (error) {
        console.error('Local parse error:', error);
        return [];
    }
};

const writeLocalBoards = (boards: SavedMoodboard[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
};

export const createCollabMetadata = () => ({
    roomId: `room_${nanoid(12)}`,
    shareToken: nanoid(24),
    access: 'public_edit_link' as const,
    createdAt: Date.now()
});

export const ensureCollabMetadata = (board: SavedMoodboard): SavedMoodboard => {
    if (board.collab?.roomId && board.collab.shareToken) return board;
    return {
        ...board,
        collab: createCollabMetadata()
    };
};

export const buildShareUrl = (roomId: string, shareToken: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('token', shareToken);
    return url.toString();
};

export const saveBoard = async (board: SavedMoodboard): Promise<void> => {
    const withCollab = ensureCollabMetadata(board);
    if (isSupabaseConfigured()) {
        const { error } = await supabase
            .from('moodboards')
            .upsert({
                id: withCollab.id,
                title: withCollab.title,
                author: withCollab.author,
                thumbnail: withCollab.thumbnail,
                data: withCollab, // Store full object in jsonb column
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
    } else {
        try {
            const boards = readLocalBoards();
            const index = boards.findIndex(b => b.id === withCollab.id);
            if (index >= 0) {
                boards[index] = withCollab;
            } else {
                boards.unshift(withCollab);
            }
            writeLocalBoards(boards);
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

        return data.map((row: any) => {
            const baseBoard = row.data as SavedMoodboard;
            const board = {
                ...baseBoard,
                id: row.id
            };
            return ensureCollabMetadata(board);
        });
    } else {
        try {
            return readLocalBoards().map(ensureCollabMetadata);
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

export const getBoardByRoom = async (roomId: string): Promise<SavedMoodboard | undefined> => {
    const boards = await getBoards();
    return boards.find((board) => board.collab?.roomId === roomId || board.id === roomId);
};

export const getBoardByRoomAndToken = async (roomId: string, shareToken: string): Promise<SavedMoodboard | undefined> => {
    const board = await getBoardByRoom(roomId);
    if (!board) return undefined;
    const tokenMatches = board.collab?.shareToken === shareToken;
    if (!tokenMatches) return undefined;
    if (board.collab?.expiresAt && Date.now() > board.collab.expiresAt) return undefined;
    return board;
};

export const rotateBoardShareToken = async (board: SavedMoodboard): Promise<SavedMoodboard> => {
    const updated: SavedMoodboard = {
        ...board,
        collab: {
            ...(board.collab ?? createCollabMetadata()),
            shareToken: nanoid(24)
        }
    };
    await saveBoard(updated);
    return updated;
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
        const localBoards = readLocalBoards();
        const newBoards = localBoards.filter(b => b.id !== id);
        writeLocalBoards(newBoards);
    }
};
