import type { BoardItem } from '../OrganicMoodboard';

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

export const saveBoard = (board: SavedMoodboard): void => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const boards: SavedMoodboard[] = stored ? JSON.parse(stored) : [];
        // Check if exists, update logic or unique? For now, always new or update by ID
        const index = boards.findIndex(b => b.id === board.id);
        if (index >= 0) {
            boards[index] = board;
        } else {
            boards.unshift(board); // Newest first
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
    } catch (e) {
        console.error("Failed to save board", e);
        // Could fail if quota exceeded (images are large)
        alert("Failed to save. Storage might be full.");
    }
};

export const getBoards = (): SavedMoodboard[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load boards", e);
        return [];
    }
};

export const getBoard = (id: string): SavedMoodboard | undefined => {
    const boards = getBoards();
    return boards.find(b => b.id === id);
};

export const deleteBoard = (id: string): void => {
    const boards = getBoards();
    const newBoards = boards.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoards));
};
