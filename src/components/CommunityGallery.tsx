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
        <div className="w-full h-full bg-[#f5f5f5] overflow-y-auto custom-scrollbar p-8 md:p-16 relative">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div>
                        <h1 className="text-[32px] md:text-[40px] font-medium text-[#2a2a2a] mb-2 leading-tight">Community</h1>
                        <p className="text-[14px] font-normal leading-[21px] text-[#333]">Explore collections curated by others.</p>
                    </div>
                    <button
                        onClick={onCreateNew}
                        className="group flex items-center gap-2 px-5 py-2 bg-[#2a2a2a] text-white rounded-[8px] text-[14px] hover:bg-black transition-colors"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Create New Board</span>
                    </button>
                </div>

                {/* Gallery Grid */}
                {boards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[20px] flex items-center justify-center mb-4">
                            <Heart size={24} className="text-[#999]" />
                        </div>
                        <h3 className="text-[20px] font-medium text-[#2a2a2a] mb-2">No boards yet</h3>
                        <p className="text-[14px] font-normal leading-[21px] text-[#333]">Be the first to share your creativity with the community.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {boards.map((board, index) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative bg-white rounded-[20px] overflow-hidden border border-[#ddd] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer flex flex-col h-[400px]"
                                onClick={() => setSelectedBoard(board)}
                            >
                                {/* Thumbnail */}
                                <div className="h-[260px] w-full overflow-hidden bg-[#f5f5f5] relative">
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
                                        <div className="w-full h-full flex items-center justify-center text-[#999]">
                                            <span className="text-[14px]">No Preview</span>
                                        </div>
                                    )}

                                    {/* Actions Overlay */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                        <button
                                            onClick={(e) => handleDelete(e, board.id)}
                                            className="p-2 bg-white border border-[#ddd] rounded-[8px] text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-[26px] flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-[20px] font-medium leading-[22px] text-[#2a2a2a] mb-2 line-clamp-1">{board.title || "Untitled"}</h3>
                                        <div className="flex items-center gap-2 text-[14px] text-[#333]">
                                            <User size={14} />
                                            <span className="line-clamp-1">{board.author || "Anonymous"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-[#e6e6e6] mt-4">
                                        <div className="flex items-center gap-1.5 text-[14px] text-[#999]">
                                            <Calendar size={14} />
                                            <span>{new Date(board.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <div className="px-3 py-1 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[8px] text-[14px] text-black">
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
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 bg-black/40" onClick={() => setSelectedBoard(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-[20px] overflow-hidden border border-[#ddd] shadow-[0_16px_64px_rgba(0,0,0,0.15)] max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image Side */}
                        <div className="flex-1 bg-[#f5f5f5] relative overflow-hidden flex items-center justify-center p-4 bg-contain bg-center bg-no-repeat" style={{ backgroundColor: selectedBoard.settings?.background || '#f5f5f5' }}>
                            {selectedBoard.thumbnail ? (
                                selectedBoard.thumbnail.startsWith('data:video') ? (
                                    <video
                                        src={selectedBoard.thumbnail}
                                        className="max-w-full max-h-full object-contain rounded-[8px]"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : (
                                    <img src={selectedBoard.thumbnail} alt={selectedBoard.title} className="max-w-full max-h-full object-contain rounded-[8px]" />
                                )
                            ) : (
                                <div className="text-[#999] text-[14px]">No Preview Available</div>
                            )}
                        </div>

                        {/* Info Side */}
                        <div className="w-full md:w-[400px] p-[26px] flex flex-col bg-white border-l border-[#ddd]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-[24px] font-medium text-[#2a2a2a] mb-2 leading-tight">{selectedBoard.title || "Untitled"}</h2>
                                    <div className="flex items-center gap-2 text-[14px] text-[#333]">
                                        <User size={16} />
                                        <span className="font-medium">{selectedBoard.author || "Anonymous"}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedBoard(null)} className="p-2 hover:bg-[#f2f2f2] border border-transparent hover:border-[#e6e6e6] rounded-[8px] transition-colors text-[#333]">
                                    <span className="text-2xl leading-none">&times;</span>
                                </button>
                            </div>

                            <div className="space-y-5 flex-1 overflow-y-auto">
                                <div className="space-y-1.5">
                                    <h4 className="text-[14px] font-medium text-[#2a2a2a]">Created</h4>
                                    <p className="text-[14px] font-normal leading-[21px] text-[#333]">{new Date(selectedBoard.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="text-[14px] font-medium text-[#2a2a2a]">Layout</h4>
                                    <p className="text-[14px] font-normal leading-[21px] text-[#333] capitalize">{selectedBoard.settings?.layoutMode} Mode</p>
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="text-[14px] font-medium text-[#2a2a2a]">Stats</h4>
                                    <p className="text-[14px] font-normal leading-[21px] text-[#333]">{selectedBoard.items?.length || 0} Items</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-[#e6e6e6] flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        onLoadBoard(selectedBoard);
                                        setSelectedBoard(null);
                                    }}
                                    className="w-full py-3 bg-[#2a2a2a] text-white rounded-[8px] text-[14px] font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>Remix / Edit Board</span>
                                </button>
                                <button
                                    onClick={() => setSelectedBoard(null)}
                                    className="w-full py-2.5 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[8px] text-[14px] text-black hover:bg-[#e6e6e6] transition-colors"
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
