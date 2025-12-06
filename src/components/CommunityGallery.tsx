import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Heart, Calendar, User, Trash2 } from 'lucide-react';
import { getBoards, deleteBoard } from '../services/storage';
import type { SavedMoodboard } from '../services/storage';

interface CommunityGalleryProps {
    onLoadBoard: (board: SavedMoodboard) => void;
    onCreateNew: () => void;
}

const CommunityGallery: React.FC<CommunityGalleryProps> = ({ onLoadBoard, onCreateNew }) => {
    const [boards, setBoards] = useState<SavedMoodboard[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await getBoards();
            setBoards(data);
        };
        load();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this moodboard?")) {
            await deleteBoard(id);
            setBoards(prev => prev.filter(b => b.id !== id));
        }
    };

    const [selectedBoard, setSelectedBoard] = useState<SavedMoodboard | null>(null);

    return (
        <div className="w-full h-full bg-[#f8f9fa] overflow-y-auto custom-scrollbar p-8 md:p-16 relative">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-2">Community</h1>
                        <p className="text-gray-500 font-light text-lg">Explore collections curated by others.</p>
                    </div>
                    <button
                        onClick={onCreateNew}
                        className="group flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Create New Board</span>
                    </button>
                </div>

                {/* Gallery Grid */}
                {boards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <Heart size={24} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-600 mb-2">No boards yet</h3>
                        <p className="text-gray-500">Be the first to share your creativity with the community.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {boards.map((board, index) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 flex flex-col h-[400px]"
                                onClick={() => setSelectedBoard(board)}
                            >
                                {/* Thumbnail */}
                                <div className="h-[260px] w-full overflow-hidden bg-gray-100 relative">
                                    {board.thumbnail ? (
                                        board.thumbnail.startsWith('data:video') ? (
                                            <video
                                                src={board.thumbnail}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <img src={board.thumbnail} alt={board.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <span className="text-xs uppercase tracking-widest">No Preview</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                                    {/* Actions Overlay */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                        <button
                                            onClick={(e) => handleDelete(e, board.id)}
                                            className="p-2 bg-white/90 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm backdrop-blur-sm"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xl font-medium text-gray-900 mb-1 line-clamp-1 group-hover:text-[#8A673F] transition-colors">{board.title || "Untitled"}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <User size={14} />
                                            <span className="line-clamp-1">{board.author || "Anonymous"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <Calendar size={12} />
                                            <span>{new Date(board.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            {board.settings?.layoutMode || 'Organic'}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* PREVIEW MODAL */}
            {selectedBoard && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBoard(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image Side */}
                        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4 bg-contain bg-center bg-no-repeat" style={{ backgroundColor: selectedBoard.settings?.background || '#f3f4f6' }}>
                            {selectedBoard.thumbnail ? (
                                selectedBoard.thumbnail.startsWith('data:video') ? (
                                    <video
                                        src={selectedBoard.thumbnail}
                                        className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : (
                                    <img src={selectedBoard.thumbnail} alt={selectedBoard.title} className="max-w-full max-h-full object-contain shadow-lg rounded-md" />
                                )
                            ) : (
                                <div className="text-gray-400">No Preview Available</div>
                            )}
                        </div>

                        {/* Info Side */}
                        <div className="w-full md:w-[400px] p-8 flex flex-col bg-white border-l border-gray-100">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-serif text-gray-900 mb-2">{selectedBoard.title || "Untitled"}</h2>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <User size={16} />
                                        <span className="font-medium">{selectedBoard.author || "Anonymous"}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedBoard(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                                    <Trash2 className="opacity-0" size={0} /> {/* Spacer hack or just use X icon */}
                                    <span className="text-2xl leading-none">&times;</span>
                                </button>
                            </div>

                            <div className="space-y-6 flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Created</h4>
                                    <p className="text-gray-700">{new Date(selectedBoard.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Layout</h4>
                                    <p className="text-gray-700 capitalize">{selectedBoard.settings?.layoutMode} Mode</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Stats</h4>
                                    <p className="text-gray-700">{selectedBoard.items?.length || 0} Items</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        onLoadBoard(selectedBoard);
                                        setSelectedBoard(null);
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Remix / Edit Board</span>
                                </button>
                                <button
                                    onClick={() => setSelectedBoard(null)}
                                    className="w-full py-3 text-gray-500 font-medium hover:text-gray-900 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CommunityGallery;
