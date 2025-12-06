import React, { useState, useRef, useEffect } from 'react';
// FIX: Added 'type' keyword before Variants to satisfy strict TS rules
import { motion, AnimatePresence, usePresence, useMotionValue, useVelocity, useTransform, useSpring, animate } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
    Download, X, Plus, Type, SlidersHorizontal, Scaling, CaseUpper,
    Grid2X2, RefreshCw, ChevronLeft, ChevronRight,
    Copy, Play, Pause, Sparkles as MagicIcon, Loader, Infinity as InfinityIcon, RotateCw, Music, FileImage, Shuffle, Users
} from 'lucide-react';
// Ensure this path matches where you put the file
import { generateMoodImageFromBoard, generateBoardDescription } from './services/imageGenerator';
import MoodLogo from '../mood/src/assets/moodlogo.svg';
import { TourGuide } from './components/TourGuide';
import { PDFFlipBook } from './components/PDFFlipBook'; // Import PDF component
import { ShaderBackground } from './components/ShaderBackground'; // Import ShaderBackground
import { DissolveEffect } from './components/DissolveEffect'; // Import DissolveEffect
import { saveBoard } from './services/storage'; // Import storage service
import type { SavedMoodboard } from './services/storage'; // Import type separately
import CommunityGallery from './components/CommunityGallery'; // Import CommunityGallery

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { pdfjs } from 'react-pdf';

// Configure worker for PDF processing
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Constants ---
const QUOTES = [
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Design is intelligence made visible.", author: "Alina Wheeler" },
    { text: "Less is more.", author: "Mies van der Rohe" },
    { text: "Creativity takes courage.", author: "Henri Matisse" },
    { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
];

const ARTISTS = [
    "Alex Chen", "Jordan Lee", "Casey Smith", "Taylor Kim", "Morgan Davis",
    "Jamie Wilson", "Riley Brown", "Avery Miller", "Quinn Taylor", "Skyler Anderson",
    "Dakota Thomas", "Reese Martinez", "Cameron White", "Parker Harris", "Sage Clark"
];

const FONTS = [
    { name: "Piazzolla", family: "'Piazzolla', serif" },
    { name: "Modern Sans", family: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
    { name: "Elegant Serif", family: "Georgia, Cambria, 'Times New Roman', Times, serif" },
    { name: "Tech Mono", family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    { name: "Clean Rounded", family: "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif" },
    { name: "Classic Print", family: "'Courier New', Courier, monospace" },
];

// --- Types ---
export type BoardItem = {
    id: string;
    type: 'image' | 'text' | 'video' | 'audio' | 'pdf';
    content: string;
    author?: string;
    x: number;
    y: number;
    rotation: number;
    zIndex: number;
    width: number;
    height?: number;
    manualWidth?: number;
    aspectRatio?: number;
    isLoading?: boolean; // Added for loading state
    isGenerated?: boolean; // Added to track AI generated images
};

// --- STYLES FOR EFFECTS ---
const Styles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Piazzolla:wght@400;500&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@500&display=swap');
    @keyframes rainbow-pulse {
      0% { filter: hue-rotate(0deg) blur(15px); opacity: 0.4; }
      50% { filter: hue-rotate(180deg) blur(20px); opacity: 0.6; transform: scale(1.02); }
      100% { filter: hue-rotate(360deg) blur(15px); opacity: 0.4; }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes dreamy-glow {
      0% { box-shadow: 0 0 8px rgba(249, 115, 22, 0.4), 0 0 16px rgba(249, 115, 22, 0.2); border-color: rgba(249, 115, 22, 0.6); }
      50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3); border-color: rgba(59, 130, 246, 0.6); }
      100% { box-shadow: 0 0 8px rgba(249, 115, 22, 0.4), 0 0 16px rgba(249, 115, 22, 0.2); border-color: rgba(249, 115, 22, 0.6); }
    }
    .ai-button-glow {
      animation: dreamy-glow 4s infinite ease-in-out;
      border: 1px solid rgba(249, 115, 22, 0.5);
    }
    .magical-glow {
      position: absolute;
      inset: -10px;
      background: linear-gradient(45deg, #ff00cc, #3333ff, #00ccff, #ff00cc);
      background-size: 400%;
      border-radius: inherit;
      z-index: -1;
      animation: rainbow-pulse 4s linear infinite;
      pointer-events: none;
    }
    .border-beam {
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        background: conic-gradient(from 0deg, transparent 0%, transparent 70%, rgba(255, 255, 255, 0.8) 90%, transparent 100%);
        animation: spin 3s linear infinite;
        filter: blur(3px);
        z-index: 0;
    }
    /* Minimal Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      margin-block: 20px; /* Offsets from top/bottom */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 10px;
      backdrop-filter: blur(4px);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.2);
    }
    @keyframes gradient-move {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes wave-scroll {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
    }
    @keyframes icon-dance {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.1) rotate(-10deg); }
        75% { transform: scale(1.1) rotate(10deg); }
    }
    .icon-dance {
        animation: icon-dance 1s ease-in-out infinite;
    }
  `}</style>
);

// --- DOCK BUTTON COMPONENT ---
// Updated for lighter, modern menu: Dark text on light background
const DockButton = ({ onClick, icon: Icon, label, active = false, className = "", id }: any) => (
    <button
        id={id}
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative 
      ${active ? 'bg-black text-white shadow-xl scale-105' : 'hover:bg-black/5 text-neutral-600 hover:text-black hover:scale-105'} 
      ${className}`}
    >
        <Icon size={22} strokeWidth={1.5} />
        {label && (
            <span className="absolute -top-10 bg-white/80 backdrop-blur-md text-black/80 border border-black/5 shadow-sm text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {label}
            </span>
        )}
    </button>
);

// --- ANIMATED MESH GRADIENT ---
// --- ANIMATED MESH GRADIENT ---
const MeshGradient = ({ palette, speed = 1 }: { palette: string[], speed?: number }) => {
    const safePalette = palette.length >= 3 ? palette : ['#F3F4F6', '#E5E7EB', '#D1D5DB'];
    return (
        <div className="absolute inset-0 overflow-hidden z-0 rounded-[inherit] opacity-60 saturate-110 pointer-events-none">
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 50, 0],
                    scale: [1, 1.2, 1],
                    backgroundColor: safePalette[0]
                }}
                transition={{
                    x: { duration: 10 / speed, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 10 / speed, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 10 / speed, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[100px]"
            />
            <motion.div
                animate={{
                    x: [0, -70, 30, 0],
                    y: [0, 60, -40, 0],
                    scale: [1, 1.3, 1],
                    backgroundColor: safePalette[1]
                }}
                transition={{
                    x: { duration: 12 / speed, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 12 / speed, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 12 / speed, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute top-[20%] right-[-20%] w-[60%] h-[80%] rounded-full blur-[100px]"
            />
            <motion.div
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, -30, 30, 0],
                    scale: [1, 1.1, 1],
                    backgroundColor: safePalette[2]
                }}
                transition={{
                    x: { duration: 9 / speed, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 9 / speed, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 9 / speed, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[100px]"
            />
        </div>
    );
};

// --- LOADING SKELETON ---
const LoadingCards = () => (
    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[inherit]">
        <div className="relative w-24 h-32 mb-8">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 bg-white border border-gray-200 shadow-xl rounded-xl"
                    initial={{ rotate: i * 5, y: 0, opacity: 0 }}
                    animate={{
                        rotate: [i * 5, i * 15, i * 5],
                        y: [0, -20, 0],
                        opacity: 1,
                        scale: [1, 1.05, 1],
                        zIndex: [i, i + 3, i]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="text-sm font-semibold text-gray-500 tracking-widest uppercase"
        >
            Adding images...
        </motion.p>
    </div>
);

// --- PARTICLE EXPLOSION COMPONENT ---


// --- AUDIO PLAYER COMPONENT ---
const AudioPlayer = ({ src, fileName, style, className, imageRadius }: any) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div
            className={`flex items-center gap-3 p-4 border-[3px] border-white/20 shadow-lg overflow-hidden relative ${className}`}
            style={{
                ...style,
                borderRadius: `${imageRadius}px`,
                backdropFilter: "blur(20px)"
            }}
        >
            {/* Background Layer with Mask */}
            <div
                className="absolute inset-0 z-0 transition-all duration-500"
                style={{
                    background: isPlaying
                        ? "repeating-linear-gradient(90deg, #a8edea, #fed6e3 25%, #a8edea 50%)"
                        : "rgba(255, 255, 255, 0.8)",
                    backgroundSize: isPlaying ? "200% 100%" : "auto",
                    animation: isPlaying ? "wave-scroll 3s linear infinite" : "none",
                    maskImage: isPlaying ? 'linear-gradient(to bottom, transparent 20%, black 100%)' : 'none',
                    WebkitMaskImage: isPlaying ? 'linear-gradient(to bottom, transparent 20%, black 100%)' : 'none'
                }}
            />

            <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} />

            <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-gray-900 border border-white/20 hover:scale-105 transition-all shadow-sm flex-shrink-0 cursor-pointer z-20 backdrop-blur-sm"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isPlaying ? 'text-gray-600' : 'text-gray-400'}`}>Audio</div>
                <div className="text-sm font-medium text-gray-800 truncate w-full" title={fileName}>{fileName || "Unknown Track"}</div>
            </div>

            <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 relative z-10 transition-colors ${isPlaying ? 'bg-white/50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                <Music size={16} className={isPlaying ? "icon-dance" : ""} />
            </div>
        </div>
    );
};

// --- BOARD ITEM COMPONENT ---
// --- FLIPPABLE IMAGE COMPONENT ---
const FlippableImage = ({ item, isFlipped, onToggleFlip, style, className, showBorders, imageRadius, borderThickness = 10, children, boardTitle, boardAuthor, isShaderActive, isExporting }: any) => {

    // Helper to render the media content with common styling
    const renderMediaContent = () => (
        <div className={`w-full h-full overflow-hidden ${showBorders && !isShaderActive ? 'bg-white/40 backdrop-blur-md' : ''}`}
            style={{
                padding: '0px',
                borderRadius: `${imageRadius}px`,
                boxShadow: showBorders
                    ? (isShaderActive
                        ? '0 30px 60px -12px rgba(0,0,0,0.6)' // Deeper shadow for shader mode
                        : `0 0 0 ${borderThickness}px rgba(255,255,255,0.2), 0 25px 50px -12px rgba(0,0,0,0.5)`
                    )
                    : '0 25px 50px -12px rgba(0,0,0,0.5)',
                outline: (showBorders && !isShaderActive) ? '1px solid rgba(209, 213, 219, 0.6)' : 'none',
                outlineOffset: (showBorders && !isShaderActive) ? `${borderThickness}px` : '0px'
            }}>
            {item.type === 'video' ? (
                <video
                    src={item.content}
                    className="pointer-events-none select-none object-cover w-full h-full block"
                    style={{
                        borderRadius: `${imageRadius}px`,
                        objectFit: 'cover'
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            ) : (
                <img
                    src={item.content}
                    className="pointer-events-none select-none object-cover w-full h-full block"
                    style={{
                        borderRadius: `${imageRadius}px`,
                        objectFit: 'cover'
                    }}
                    crossOrigin="anonymous"
                />
            )}
            {children}
        </div>
    );

    // NORMAL RENDER (FLAT, NO FLIPPING)
    return (
        <motion.div
            className={`relative w-full h-full ${className}`}
            style={{
                ...style,
                cursor: 'default', // Removed pointer cursor since clicking does nothing now
            }}
            initial={false}
            animate={{
                scale: 1, // Reset specific scale animations related to flip
            }}
        >
            {/* FRONT FACE ONLY */}
            <div className="absolute inset-0 w-full h-full">
                {renderMediaContent()}

                {/* SHADER MODE GRADIENT STROKE */}
                {isShaderActive && showBorders && (
                    <div
                        className="absolute inset-0 pointer-events-none z-50"
                        style={{
                            borderRadius: `${imageRadius}px`,
                            padding: '1.5px', // Stroke thickness
                            background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'exclude',
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'xor',
                        }}
                    />
                )}
            </div>
        </motion.div>
    );
};

// --- INSPIRATION QUOTE COMPONENT ---
const INSPIRATION_QUOTES = [
    "A hush of colors drifts like fog over a quiet sea, inviting every sketch to breathe.",
    "The moodboard is a map of soft weather—luminous storms, tender shadows, and roads made of hue.",
    "Texture becomes memory: velvet echoes, grain murmurs, paper remembers our touch.",
    "A small constellation of references—each image a star, each note a faint gravity.",
    "We collect the air itself: a breeze of ideas, a draft that turns into weather."
];

const InspirationQuote = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % INSPIRATION_QUOTES.length);
        }, 60000); // 1 minute
        return () => clearInterval(timer);
    }, []);

    const handleClick = () => {
        setIndex((prev) => (prev + 1) % INSPIRATION_QUOTES.length);
    };

    const words = INSPIRATION_QUOTES[index].split(" ");

    return (
        <div
            className="max-w-md cursor-pointer pointer-events-auto"
            onClick={handleClick}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                        visible: { transition: { staggerChildren: 0.12 } },
                        hidden: {}
                    }}
                    className="flex flex-wrap gap-x-1.5"
                >
                    {words.map((word, i) => (
                        <motion.span
                            key={i}
                            variants={{
                                hidden: { opacity: 0, filter: 'blur(10px)', x: -10 },
                                visible: { opacity: 1, filter: 'blur(0px)', x: 0, transition: { duration: 2.5, ease: "easeInOut" } }
                            }}
                            className="text-sm font-medium text-gray-400 tracking-wide leading-relaxed"
                        >
                            {word}
                        </motion.span>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const InteractiveQuote = () => {
    const text = "Design the feeling first; let evidence arrange the form.";
    const words = text.split(" ");

    // Mouse position state
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="text-2xl md:text-3xl font-serif text-center max-w-lg leading-relaxed italic pointer-events-auto cursor-default select-none relative"
        >
            {/* Base layer - Dimmed */}
            <div className="text-gray-300 opacity-20 transition-opacity duration-500">
                {words.map((word, i) => (
                    <span key={i} className="inline-block mx-1.5">
                        {word === "first;" ? (
                            <>
                                first;
                                <br className="hidden md:block" />
                            </>
                        ) : word}
                    </span>
                ))}
            </div>

            {/* Overlay layer - Soft Pastel Gradient Masked */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                    maskImage: isHovering
                        ? `radial-gradient(circle 80px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
                        : `radial-gradient(circle 0px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`,
                }}
                style={{
                    WebkitMaskImage: isHovering
                        ? `radial-gradient(circle 80px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
                        : `radial-gradient(circle 0px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`,
                }}
                transition={{ type: "tween", ease: "backOut", duration: 0.2 }}
            >
                <motion.div
                    className="bg-gradient-to-r from-rose-300 via-purple-300 via-sky-300 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] bg-[length:200%_auto]"
                    animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                        duration: 10,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                >
                    {words.map((word, i) => (
                        <span key={i} className="inline-block mx-1.5">
                            {word === "first;" ? (
                                <>
                                    first;
                                    <br className="hidden md:block" />
                                </>
                            ) : word}
                        </span>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
};

const LoadingOverlay = ({ message, progress }: { message: string, progress: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center pointer-events-none"
        >
            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center border border-white/20">
                <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-gray-200"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-purple-600 transition-all duration-300 ease-in-out"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - progress / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-serif text-gray-900 mb-1">Rendering</h3>
                    <p className="text-sm text-gray-500 font-medium">{message}</p>
                </div>
                <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                </div>
            </div>
        </motion.div>
    );
};

const BoardItem = React.forwardRef(({
    item,

    isExporting,
    magicalItems,
    removeItem,
    handleResizeStart,
    handleRotateStart, // New prop
    imageRadius,

    showBorders,
    borderThickness, // Added prop
    quoteSize,
    updateItemContent,
    bringToFront,
    isActive, // for Show mode
    resizingId,
    containerRef,
    index, // Added index for staggered animation
    isFlipped, // Added for 3D flip
    onToggleFlip,
    boardTitle,
    boardAuthor,
    layoutMode, // Added layoutMode explicitly
}: any, ref: any) => {
    const [isPresent, safeToRemove] = usePresence();
    const isDraggingRef = useRef(false); // Track dragging state
    const [shadowColor, setShadowColor] = useState("rgba(0, 0, 0, 0.5)"); // Default shadow color

    // Extract dominant color for shadow
    useEffect(() => {
        if (item.type === 'image' && item.content) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = item.content;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = 1; canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                setShadowColor(`rgba(${r}, ${g}, ${b}, 0.6)`);
            };
        }
    }, [item.content, item.type]);



    // ... inside BoardItem ...

    useEffect(() => {
        if (!isPresent) {
            const timer = setTimeout(safeToRemove, 2000); // 2s duration to match shader
            return () => clearTimeout(timer);
        }
    }, [isPresent, safeToRemove]);

    // If deleted and it's an image, show dissolve effect
    const showDissolve = !isPresent && item.type === 'image';

    // Calculate height to prevent collapse during explosion
    // Also used for maintaining aspect ratio during resize/layout
    const computedHeight = (item.type === 'image' || item.type === 'video' || item.type === 'pdf') && item.aspectRatio
        ? item.width * item.aspectRatio
        : item.height;

    // --- WIGGLE EFFECT LOGIC ---
    const x = useMotionValue(0);
    const y = useMotionValue(0); // Added y motion value
    const xVelocity = useVelocity(x);
    const smoothVelocity = useSpring(xVelocity, { damping: 50, stiffness: 400 });
    // Map velocity to rotation: moving right -> rotate right (positive), moving left -> rotate left (negative)
    // Range: -1000 to 1000 velocity maps to -15 to 15 degrees rotation
    const velocityRotate = useTransform(smoothVelocity, [-1000, 1000], [-15, 15]);

    // Combine base rotation with velocity rotation
    // We need to use a transform to add the base rotation to the velocity rotation
    const currentRotation = useTransform(velocityRotate, (r) => item.rotation + r);

    return (
        <motion.div
            ref={ref}
            layoutId={item.id}
            layout={isPresent && resizingId !== item.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: 1,
                scale: isActive ? 1.05 : 1,
                x: 0,
                y: 0,
                zIndex: item.zIndex,
                ...(resizingId === item.id ? {} : {
                    width: item.width,
                    height: computedHeight
                })
            }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }} // Keep opacity 1 longer? No, we want to fade out the container while shader runs? 
            // Actually, if we fade out the container, the shader fades too.
            // Let's set exit opacity to 1, and let the shader handle the fade out visually?
            // Or keep opacity 1 for most of the time then fade?
            // If I set exit opacity to 0 over 2s, the shader will also fade out. That's fine, it adds to the effect.
            transition={{
                type: "spring",
                stiffness: 120, // Softer spring (was 300)
                damping: 20,    // Smoother deceleration (was 30)
                mass: 1,
                delay: index * 0.02, // Staggered delay for "wave" effect
                opacity: { duration: 0.2 }
            }}
            drag={!isExporting}
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false} // Disable default momentum to use custom bounce physics
            dragTransition={{ power: 0.2, timeConstant: 200 }}
            onDragStart={() => {
                isDraggingRef.current = true;
                bringToFront(item.id);
            }}
            onDragEnd={(_, info) => {
                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 50);

                // --- BOUNCE BACK PHYSICS ---
                if (!containerRef.current) return;

                const container = containerRef.current.getBoundingClientRect();
                const itemWidth = item.width;
                const itemHeight = typeof computedHeight === 'number' ? computedHeight : itemWidth; // Approximation if auto

                // Calculate initial position in pixels
                const initialLeft = (item.x / 100) * container.width;
                const initialTop = (item.y / 100) * container.height;

                // Calculate bounds for translation (x, y)
                // We add a small margin so items can go slightly closer to the edge or off-screen before bouncing
                const margin = -20;
                const minX = -initialLeft - margin;
                const maxX = container.width - itemWidth - initialLeft + margin;
                const minY = -initialTop - margin;
                const maxY = container.height - itemHeight - initialTop + margin;

                // Physics constants
                const power = 0.2; // How far it travels based on velocity
                const bounceFactor = 0.5; // Energy kept after bounce (0.5 = 50%)


                // Helper to calculate target with bounce
                const calculateBounce = (current: number, velocity: number, min: number, max: number) => {
                    const projected = current + velocity * power;
                    if (projected < min) {
                        const overshoot = min - projected;
                        return min + overshoot * bounceFactor;
                    } else if (projected > max) {
                        const overshoot = projected - max;
                        return max - overshoot * bounceFactor;
                    }
                    return projected;
                };

                const targetX = calculateBounce(x.get(), info.velocity.x, minX, maxX);
                const targetY = calculateBounce(y.get(), info.velocity.y, minY, maxY);

                animate(x, targetX, { type: "spring", stiffness: 200, damping: 20 });
                animate(y, targetY, { type: "spring", stiffness: 200, damping: 20 });
            }}
            onPointerDown={() => bringToFront(item.id)}
            style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}px`,
                height: computedHeight !== 'auto' ? `${computedHeight}px` : 'auto',
                perspective: '1000px',
                borderRadius: `${imageRadius}px`,
                rotate: isExporting ? 0 : currentRotation, // Force 0 rotation during export
                x,
                y, // Bind y motion value
            }}
            whileHover={!isExporting ? { scale: 1.015, cursor: 'grab', zIndex: 999 } : {}}
            whileDrag={{
                scale: 1.15,
                // rotate: 5, // REMOVED: Static rotation replaced by dynamic wiggle
                boxShadow: `0 40px 80px -20px ${shadowColor}`,
                cursor: 'grabbing',
                zIndex: 9999
            }}
            className="absolute group"
        >
            {showDissolve ? (
                <div className="absolute inset-0 z-50 overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                    <DissolveEffect imageUrl={item.content} duration={2000} initialColor={shadowColor} />
                </div>
            ) : (
                <div className="relative w-full h-full">
                    {/* MAGICAL GLOW FOR NEW AI IMAGES */}
                    {magicalItems.includes(item.id) && (
                        <div className="magical-glow" />
                    )}

                    {!isExporting && (
                        <button
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-sm hover:scale-110"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    )}

                    {item.isLoading ? (
                        <motion.div
                            className="relative w-full h-full"
                            animate={{
                                y: [0, -15, 0],
                                rotate: [0, 1, -1, 0],
                                scale: [1, 1.02, 1],
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            {/* Outer Glow Effect */}
                            <div className="absolute -inset-8 opacity-60 blur-2xl z-0">
                                <MeshGradient palette={['#FF9A9E', '#FECFEF', '#A18CD1']} speed={0.3} />
                            </div>

                            {/* Main Card */}
                            <div
                                className="w-full h-full bg-white/30 flex flex-col items-center justify-center relative overflow-hidden border-[3px] border-white/20 shadow-xl z-10 backdrop-blur-md"
                                style={{ borderRadius: `${imageRadius}px` }}
                            >
                                <MeshGradient palette={['#FF9A9E', '#FECFEF', '#A18CD1']} speed={0.3} />
                                <div className="absolute inset-0 bg-white/10 backdrop-blur-[20px] z-0" />

                                <Loader className="w-8 h-8 text-white animate-spin mb-3 relative z-10 drop-shadow-md" />
                                <motion.span
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-xs text-white font-bold tracking-widest uppercase relative z-10 drop-shadow-sm"
                                >
                                    Curating...
                                </motion.span>
                            </div>
                        </motion.div>
                    ) : (item.type === 'image' || item.type === 'video') ? (
                        <FlippableImage
                            item={item}
                            // In 'animate' (Show) mode, disable flipping completely to prevent screenshot issues and keep cleaner look
                            isFlipped={layoutMode === 'animate' ? false : isFlipped}
                            onToggleFlip={(id: string) => {
                                // Disable flip interaction in 'animate' mode
                                if (layoutMode === 'animate') return;

                                if (!isDraggingRef.current) {
                                    onToggleFlip(id);
                                }
                            }}
                            isExporting={isExporting}
                            showBorders={showBorders}
                            imageRadius={imageRadius}
                            borderThickness={borderThickness}
                            boardTitle={boardTitle}
                            boardAuthor={boardAuthor}
                        >
                            {!isExporting && (
                                <>
                                    <div
                                        onPointerDown={(e) => handleResizeStart(e, item.id, item.width, item.aspectRatio)}
                                        className="absolute bottom-4 right-4 w-8 h-8 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg opacity-0 group-hover:opacity-100 cursor-ew-resize flex items-center justify-center transition-opacity z-50 hover:bg-white"
                                        onClick={(e) => e.stopPropagation()} // Prevent flip when resizing
                                    >
                                        <Scaling size={14} className="text-gray-600" />
                                    </div>
                                    <div
                                        onPointerDown={(e) => handleRotateStart(e, item.id, item.rotation)}
                                        className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg opacity-0 group-hover:opacity-100 cursor-grab flex items-center justify-center transition-opacity z-50 hover:bg-white"
                                        onClick={(e) => e.stopPropagation()} // Prevent flip when rotating
                                    >
                                        <RotateCw size={14} className="text-gray-600" />
                                    </div>
                                </>
                            )}
                        </FlippableImage>
                    ) : item.type === 'audio' ? (
                        <AudioPlayer
                            src={item.content}
                            fileName={item.author}
                            imageRadius={imageRadius}
                            className="w-full h-full"
                        />
                    ) : item.type === 'pdf' ? (
                        <PDFFlipBook
                            file={item.content}
                            width={item.width}
                            height={computedHeight}
                            showBorders={showBorders}
                            borderThickness={borderThickness}
                            imageRadius={imageRadius}
                        >
                            {!isExporting && (
                                <>
                                    <div
                                        onPointerDown={(e) => handleResizeStart(e, item.id, item.width, item.aspectRatio)}
                                        className="absolute bottom-4 right-4 w-8 h-8 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg opacity-0 group-hover:opacity-100 cursor-ew-resize flex items-center justify-center transition-opacity z-50 hover:bg-white"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Scaling size={14} className="text-gray-600" />
                                    </div>
                                    <div
                                        onPointerDown={(e) => handleRotateStart(e, item.id, item.rotation)}
                                        className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg opacity-0 group-hover:opacity-100 cursor-grab flex items-center justify-center transition-opacity z-50 hover:bg-white"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <RotateCw size={14} className="text-gray-600" />
                                    </div>
                                </>
                            )}
                        </PDFFlipBook>
                    ) : (
                        <div className={`border-[3px] border-white/20 p-6 shadow-xl w-full h-full ${isExporting ? 'bg-white/95' : 'bg-white/80 backdrop-blur-xl'}`}
                            style={{
                                borderRadius: `${imageRadius}px`,
                                boxShadow: '0 0 0 1px rgba(209, 213, 219, 0.6), 0 12px 24px -8px rgba(0,0,0,0.15)'
                            }}>
                            {isExporting ? (
                                <>
                                    <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">{item.author}</div>
                                    <div className="font-medium text-gray-800 leading-snug" style={{ fontSize: `${quoteSize}px` }}>{item.content}</div>
                                </>
                            ) : (
                                <>
                                    <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3 outline-none"
                                        onBlur={(e) => updateItemContent(item.id, item.content, e.currentTarget.textContent || "")}
                                    >
                                        {item.author}
                                    </div>
                                    <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        className="font-medium text-gray-800 leading-snug outline-none"
                                        style={{ fontSize: `${quoteSize}px` }}
                                        onBlur={(e) => updateItemContent(item.id, e.currentTarget.textContent || "", item.author)}
                                    >
                                        {item.content}
                                    </div>
                                </>
                            )}
                        </div>
                    )
                    }
                </div >
            )
            }
        </motion.div >
    );
});



const OrganicMoodboard = () => {
    // --- State ---
    const [items, setItems] = useState<BoardItem[]>([]);
    const [globalZIndex, setGlobalZIndex] = useState(10);
    const [layoutMode, setLayoutMode] = useState<'organic' | 'grid' | 'animate'>('organic');
    const [activeIndex, setActiveIndex] = useState(0);
    const [flippedItems, setFlippedItems] = useState<Set<string>>(new Set()); // Track flipped items
    const [isDockExpanded, setIsDockExpanded] = useState(true);
    const [hasSeenTour, setHasSeenTour] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false); // Track drag over state

    const toggleFlip = (id: string) => {
        setFlippedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    const [isPaused, setIsPaused] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            if (layoutMode === 'grid') {
                // Debounce re-layout could be better, but direct call is fine for now
                // We need to trigger a re-render or re-calculation
                // Since getGridPos uses windowWidth (which we just set), 
                // we might need to explicitly call reLayoutGrid in a separate effect or here
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [layoutMode]);

    // Re-layout grid when window width changes
    useEffect(() => {
        if (layoutMode === 'grid') {
            reLayoutGrid(items);
        }
    }, [windowWidth]);

    // View Mode State
    const [viewMode, setViewMode] = useState<'editor' | 'community'>('editor');
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

    // Style State
    const [dashboardRadius, setDashboardRadius] = useState(32);
    const [imageRadius, setImageRadius] = useState(12);
    const [background, setBackground] = useState('#FFFFFF');
    const [bgMode, setBgMode] = useState<'solid' | 'gradient' | 'shader'>('gradient');

    const [showBorders, setShowBorders] = useState(true);
    const [borderThickness, setBorderThickness] = useState(10); // New state for border thickness
    const [showGrid, setShowGrid] = useState(true); // New state for grid overlay (Default ON)
    const [gridType, setGridType] = useState<'square' | 'dot'>('dot'); // New state for grid type (Default Dot)
    const [quoteSize, setQuoteSize] = useState(20);


    const [currentFontIndex, setCurrentFontIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // New state for overlay
    const [progress, setProgress] = useState(0); // New state for progress
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false); // New state
    const [resizingId, setResizingId] = useState<string | null>(null);


    // Magical Effect State
    const [magicalItems, setMagicalItems] = useState<string[]>([]);
    const [isShaderMode, setIsShaderMode] = useState(false); // New state for Shader Mode
    const [activeShaderColors, setActiveShaderColors] = useState<string[]>([]); // New state for reactive borders
    const [enableMotionBlur, setEnableMotionBlur] = useState(false); // New state for motion blur
    const [motionBlurIntensity, setMotionBlurIntensity] = useState(0.5); // New state for motion blur intensity
    const [shaderMode, setShaderMode] = useState<'soft' | 'extreme'>('soft'); // New state for shader mode
    const [shaderItemId, setShaderItemId] = useState<string | null>(null); // Track specific item for shader background

    // Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    // Content State
    const [title, setTitle] = useState("");
    const [aboutText, setAboutText] = useState("");
    const [tags, setTags] = useState(['', '', '']);
    const [palette, setPalette] = useState(['#F3F4F6', '#F3F4F6', '#F3F4F6', '#F3F4F6', '#F3F4F6', '#F3F4F6']);
    const [author, setAuthor] = useState("");

    const exportWrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- AUTO-PLAY FOR SHOW MODE ---
    useEffect(() => {
        let interval: any;
        if (layoutMode === 'animate' && !isPaused && items.length > 0) {
            interval = setInterval(() => {
                setActiveIndex((prev) => (prev + 1) % items.length);
            }, 6000); // Updated to 6 seconds for Shader Mode
        }
        return () => clearInterval(interval);
    }, [layoutMode, isPaused, items.length]);

    // --- PASTE HANDLER ---
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData?.items) {
                const itemsList = Array.from(e.clipboardData.items);
                const files: File[] = [];
                const urls: string[] = [];

                itemsList.forEach(item => {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                    } else if (item.kind === 'string' && item.type === 'text/plain') {
                        item.getAsString(text => {
                            if (text.match(/^https?:\/\/.*/)) { // Simple URL check
                                urls.push(text);
                                if (urls.length > 0) processUrls(urls);
                            }
                        });
                    }
                });

                if (files.length > 0) {
                    processFiles(files);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [items, layoutMode, globalZIndex]); // Dependencies for processFiles/processUrls logic execution context


    // --- Helpers ---


    const updatePaletteFromAllImages = (newImageUrls: string[] = [], randomize: boolean = false) => {
        // Collect candidates (Images and Videos)
        const currentCandidates = items
            .filter(i => i.type === 'image' || i.type === 'video')
            .map(i => ({ url: i.content, type: i.type }));

        const newCandidates = newImageUrls.map(url => ({
            url,
            type: (url.match(/\.(mp4|webm|mov)$/i)) ? 'video' : 'image'
        }));

        const allCandidates = [...currentCandidates, ...newCandidates];

        if (allCandidates.length === 0) return;

        const collectedColors: string[] = [];
        const samplesPerImage = Math.ceil(6 / Math.min(allCandidates.length, 6));
        let processed = 0;

        let candidatesToScan: { url: string, type: string }[] = [];
        if (randomize) {
            const shuffled = [...allCandidates].sort(() => 0.5 - Math.random());
            candidatesToScan = shuffled.slice(0, 6);
        } else {
            candidatesToScan = allCandidates.slice(-6);
        }

        const extractColorsFromCanvas = (ctx: CanvasRenderingContext2D) => {
            const samplePoints = [[25, 25], [10, 10], [40, 40], [25, 10], [25, 40]];
            for (let i = 0; i < samplesPerImage; i++) {
                if (collectedColors.length >= 6) break;
                const pt = samplePoints[i % samplePoints.length];
                try {
                    const p = ctx.getImageData(pt[0], pt[1], 1, 1).data;
                    if (p[0] > 245 && p[1] > 245 && p[2] > 245) continue; // Skip white
                    if (p[0] < 15 && p[1] < 15 && p[2] < 15) continue; // Skip black
                    collectedColors.push(`rgb(${p[0]}, ${p[1]}, ${p[2]})`);
                } catch (e) { console.warn("Canvas read error", e); }
            }
        };

        const finish = () => {
            processed++;
            if (processed === candidatesToScan.length) {
                while (collectedColors.length < 6) collectedColors.push('#E5E7EB');
                setPalette(collectedColors);
                const gradient = `linear-gradient(135deg, ${collectedColors[0]} 0%, ${collectedColors[1]} 100%)`;

                if (bgMode === 'gradient') setBackground(gradient);
            }
        };

        candidatesToScan.forEach(candidate => {
            if (candidate.type === 'video') {
                const video = document.createElement('video');
                video.crossOrigin = "Anonymous";
                video.src = candidate.url;
                video.muted = true;
                video.playsInline = true;

                // Trigger seek to capture a frame
                video.onloadeddata = () => {
                    video.currentTime = 0.5; // Capture frame at 0.5s
                };

                video.onseeked = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 50; canvas.height = 50;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, 50, 50);
                        extractColorsFromCanvas(ctx);
                    }
                    finish();
                };

                video.onerror = () => {
                    console.warn("Could not load video for palette extraction:", candidate.url);
                    finish();
                };

                // Force load
                video.load();
            } else {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = candidate.url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { finish(); return; }

                    canvas.width = 50; canvas.height = 50;
                    ctx.drawImage(img, 0, 0, 50, 50);
                    extractColorsFromCanvas(ctx);
                    finish();
                }
                img.onerror = () => finish();
            }
        });
    };

    const updatePaletteColor = (index: number, newColor: string) => {
        const newPalette = [...palette];
        newPalette[index] = newColor;
        setPalette(newPalette);
    };

    // --- POSITION LOGIC ---
    const safeX = (val: number) => Math.max(5, Math.min(val, 75));
    const safeY = (val: number) => Math.max(5, Math.min(val, 70));

    const getOrganicPos = (index: number) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const baseX = 10 + (col * 25);
        const baseY = 10 + (row * 22);
        const jitterX = (Math.random() * 15) - 7.5;
        const jitterY = (Math.random() * 15) - 7.5;
        return {
            x: safeX(baseX + jitterX),
            y: safeY(baseY + jitterY),
            rotation: 0, // Default to 0 rotation
            heightPercent: undefined,
            scale: 1,
            opacity: 1
        };
    };

    const getGridPos = (index: number) => {
        const cols = windowWidth < 640 ? 2 : windowWidth < 1024 ? 3 : 5;
        // const rows = Math.ceil(totalCount / cols); // Unused
        const gap = 3;
        const cellWidth = (90 - (gap * (cols - 1))) / cols;
        // Fixed height for grid cells to allow scrolling, approx 20% of screen height
        const cellHeight = windowWidth < 640 ? 30 : 22;
        const col = index % cols;
        const row = Math.floor(index / cols);
        const gridTotalWidth = (cols * cellWidth) + ((cols - 1) * gap);
        const startX = (100 - gridTotalWidth) / 2;
        const startY = 10;

        return {
            x: startX + (col * (cellWidth + gap)),
            y: startY + (row * (cellHeight + gap)),
            rotation: 0,
            widthPercent: cellWidth,
            heightPercent: cellHeight,
            scale: 1,
            opacity: 1
        };
    };

    const getSmartPos = (index: number, mode = layoutMode) => {
        if (mode === 'organic') return { ...getOrganicPos(index), widthPercent: 20, heightPercent: undefined };
        return getGridPos(index);
    };

    // --- HANDLERS ---
    const processFiles = (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setIsLoading(true);
        const filesToProcess = Array.from(files).slice(0, 10);

        const newUrls: string[] = [];
        // Fallback to window dimensions if container is hidden (e.g. behind sidebar on mobile)
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;

        const itemPromises = filesToProcess.map((file, i) => {
            return new Promise<BoardItem | null>((resolve) => {
                const gridData = getSmartPos(items.length + i, layoutMode);
                const pixelWidth = (gridData.widthPercent / 100) * containerWidth;
                const pixelHeight = gridData.heightPercent ? (gridData.heightPercent / 100) * containerHeight : undefined;

                if (file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    newUrls.push(url);
                    const img = new Image();
                    img.src = url;
                    img.onload = () => {
                        const aspectRatio = img.naturalHeight / img.naturalWidth;
                        resolve({
                            id: Math.random().toString(36).substr(2, 9),
                            type: 'image',
                            content: url,
                            x: gridData.x,
                            y: gridData.y,
                            rotation: gridData.rotation,
                            zIndex: globalZIndex + 1 + i,
                            width: pixelWidth,
                            height: pixelHeight,
                            aspectRatio: aspectRatio
                        });
                    };
                    img.onerror = () => resolve(null);
                } else if (file.type.startsWith('video/')) {
                    const url = URL.createObjectURL(file);
                    const video = document.createElement('video');
                    video.src = url;
                    video.onloadedmetadata = () => {
                        const aspectRatio = video.videoHeight / video.videoWidth;
                        resolve({
                            id: Math.random().toString(36).substr(2, 9),
                            type: 'video',
                            content: url,
                            x: gridData.x,
                            y: gridData.y,
                            rotation: gridData.rotation,
                            zIndex: globalZIndex + 1 + i,
                            width: pixelWidth,
                            height: pixelHeight,
                            aspectRatio: aspectRatio
                        });
                    };
                    video.onerror = () => resolve(null);
                } else if (file.type.startsWith('audio/')) {
                    const url = URL.createObjectURL(file);
                    resolve({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'audio',
                        content: url,
                        author: file.name,
                        x: gridData.x,
                        y: gridData.y,
                        rotation: gridData.rotation,
                        zIndex: globalZIndex + 1 + i,
                        width: 320,
                        height: 80,
                        aspectRatio: undefined
                    });
                } else if (file.type === 'application/pdf') {
                    const url = URL.createObjectURL(file);

                    // Use pdfjs to detect dimensions
                    pdfjs.getDocument(url).promise.then(pdf => {
                        pdf.getPage(1).then(page => {
                            const viewport = page.getViewport({ scale: 1 });
                            const aspectRatio = viewport.height / viewport.width;

                            resolve({
                                id: Math.random().toString(36).substr(2, 9),
                                type: 'pdf',
                                content: url, // Use URL instead of base64 for better performance with react-pdf
                                x: gridData.x,
                                y: gridData.y,
                                rotation: gridData.rotation,
                                zIndex: globalZIndex + 1 + i,
                                width: 300,
                                height: undefined, // Let computedHeight handle it based on aspectRatio
                                aspectRatio: aspectRatio,
                                manualWidth: 300
                            });
                        }).catch(err => {
                            console.error("Error getting PDF page", err);
                            // Fallback
                            resolve({
                                id: Math.random().toString(36).substr(2, 9),
                                type: 'pdf',
                                content: url,
                                x: gridData.x,
                                y: gridData.y,
                                rotation: gridData.rotation,
                                zIndex: globalZIndex + 1 + i,
                                width: 300,
                                height: 420,
                                aspectRatio: 1.414,
                                manualWidth: 300
                            });
                        });
                    }).catch(err => {
                        console.error("Error loading PDF", err);
                        // Fallback
                        resolve({
                            id: Math.random().toString(36).substr(2, 9),
                            type: 'pdf',
                            content: url,
                            x: gridData.x,
                            y: gridData.y,
                            rotation: gridData.rotation,
                            zIndex: globalZIndex + 1 + i,
                            width: 300,
                            height: 420,
                            aspectRatio: 1.414,
                            manualWidth: 300
                        });
                    });
                } else {
                    resolve(null);
                }
            });
        });

        Promise.all([
            Promise.all(itemPromises.map(p => p.catch(e => { console.error("File processing error:", e); return null; }))),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]).then(([resolvedItems]) => {
            const validItems = resolvedItems.filter(item => item !== null) as BoardItem[];
            setGlobalZIndex(prev => prev + validItems.length);
            const updatedItems = [...items, ...validItems];
            setItems(updatedItems);
            updatePaletteFromAllImages(newUrls);
            if (layoutMode === 'grid') reLayoutGrid(updatedItems);
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        processFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const processUrls = (urls: string[]) => {
        if (!urls || urls.length === 0) return;
        setIsLoading(true);

        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;

        const itemPromises = urls.map((url, i) => {
            return new Promise<BoardItem | null>((resolve) => {
                const gridData = getSmartPos(items.length + i, layoutMode);
                const pixelWidth = (gridData.widthPercent / 100) * containerWidth;
                const pixelHeight = gridData.heightPercent ? (gridData.heightPercent / 100) * containerHeight : undefined;

                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = url;
                img.onload = () => {
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    resolve({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'image',
                        content: url,
                        x: gridData.x,
                        y: gridData.y,
                        rotation: gridData.rotation,
                        zIndex: globalZIndex + 1 + i,
                        width: pixelWidth,
                        height: pixelHeight,
                        aspectRatio: aspectRatio
                    });
                };
                img.onerror = () => {
                    // Try as video if image fails? Or just resolve null.
                    // Simple fallback for now:
                    resolve(null);
                };
            });
        });

        Promise.all(itemPromises).then((newItems) => {
            const validItems = newItems.filter((item): item is BoardItem => item !== null);
            if (validItems.length > 0) {
                setGlobalZIndex(prev => prev + validItems.length);
                setItems(prev => [...prev, ...validItems]);
                if (layoutMode === 'grid') {
                    // reLayoutGrid will be triggered by useEffect on items change? 
                    // No, reLayoutGrid(items) is called manually in addQuote.
                    // We should call it here with new list.
                    reLayoutGrid([...items, ...validItems]);
                }
            }
            setIsLoading(false);
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFiles(files);
            return;
        }

        // Handle URL drops (images from other sites)
        const url = e.dataTransfer.getData('URL') || e.dataTransfer.getData('text/uri-list');
        if (url) {
            // Split by newline if multiple URLs are pasted/dropped (rare for drag, possible for copy/paste code reuse later)
            const urls = url.split('\n').map(u => u.trim()).filter(u => u.length > 0);
            processUrls(urls);
            return;
        }

        // Handle HTML drops (dragging image element)
        const html = e.dataTransfer.getData('text/html');
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const img = doc.querySelector('img');
            if (img && img.src) {
                processUrls([img.src]);
            }
        }
    };

    const handleSaveToCommunity = async () => {
        setIsExporting(true); // Hide UI controls
        setIsProcessing(true);
        setProgress(0);

        // Wait for UI to hide and animations to reset
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const element = document.getElementById('moodboard-canvas');
            if (!element) throw new Error("Canvas not found");

            const width = element.offsetWidth;
            const height = element.offsetHeight;

            // Constrain resolution for performance and file size
            // A width of ~600px is decent for community grid
            const targetWidth = 600;
            const scale = targetWidth / width;
            // Ensure height is even (video encoding requirement usually, specifically h264 sometimes dislikes odd dimensions, but safer to be even)
            let targetHeight = Math.round(height * scale);
            if (targetHeight % 2 !== 0) targetHeight += 1;

            // Muxer configuration
            const muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: 'avc', // H.264
                    width: targetWidth,
                    height: targetHeight
                },
                fastStart: 'in-memory'
            });

            // VideoEncoder configuration
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => console.error(e)
            });

            videoEncoder.configure({
                codec: 'avc1.42001f', // Baseline profile
                width: targetWidth,
                height: targetHeight,
                bitrate: 1_000_000, // 1 Mbps
                framerate: 10
            });

            // Capture Loop
            // We'll capture 20 frames at 100ms interval = 2 seconds of video
            const totalFrames = 20;
            const frameDuration = 100; // ms
            const fps = 10;
            const frameDurationMicroseconds = 1_000_000 / fps;

            for (let i = 0; i < totalFrames; i++) {
                setProgress(Math.round((i / totalFrames) * 100));

                // Capture Frame
                const canvas = await html2canvas(element, {
                    scale: scale,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: bgMode === 'solid' ? background : '#FFFFFF',
                    logging: false
                });

                // Create VideoFrame from canvas
                const frame = new VideoFrame(canvas, { timestamp: i * frameDurationMicroseconds });

                // Encode
                videoEncoder.encode(frame, { keyFrame: i % 10 === 0 });
                frame.close(); // Important to close frames to avoid memory leaks

                // Wait for next frame
                await new Promise(r => setTimeout(r, frameDuration));
            }

            // Finalize
            await videoEncoder.flush();
            muxer.finalize();
            const buffer = muxer.target.buffer;

            // Create Blob and converting to Base64
            const blob = new Blob([buffer], { type: 'video/mp4' });

            const reader = new FileReader();
            const thumbnail = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });

            // Save Board
            const boardData: SavedMoodboard = {
                id: currentBoardId || Math.random().toString(36).substr(2, 9),
                title: title || 'Untitled Board',
                author: author || 'Anonymous',
                thumbnail: thumbnail, // MP4 Data URL
                timestamp: Date.now(),
                items: items,
                settings: {
                    palette,
                    background,
                    bgMode,
                    shaderMode,
                    layoutMode,
                    imageRadius,
                    borderThickness,
                    showBorders,
                    showGrid,
                    gridType,
                    quoteSize,
                    enableMotionBlur,
                    motionBlurIntensity,
                    shaderItemId
                }
            };

            await saveBoard(boardData);
            alert("Saved to community successfully! (MP4 thumbnail created)");

        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save to community. This browser might not support WebCodecs MP4 encoding.");
        } finally {
            setIsExporting(false);
            setIsProcessing(false);
        }
    };

    const handleLoadBoard = (board: SavedMoodboard) => {
        setItems(board.items);
        setTitle(board.title);
        setAuthor(board.author);
        if (board.settings) {
            setPalette(board.settings.palette || []);
            setBackground(board.settings.background || '#FFFFFF');
            setBgMode(board.settings.bgMode || 'gradient');
            setShaderMode(board.settings.shaderMode || 'soft');
            // setLayoutMode(board.settings.layoutMode || 'organic'); // Keep current layout or load? User might prefer exploring. Let's load it.
            // Actually, keep it flexible.
            if (board.settings.layoutMode) setLayoutMode(board.settings.layoutMode);

            setImageRadius(board.settings.imageRadius ?? 12);
            setBorderThickness(board.settings.borderThickness ?? 10);
            setShowBorders(board.settings.showBorders ?? true);
            setShowGrid(board.settings.showGrid ?? true);
            setGridType(board.settings.gridType || 'dot');
            setQuoteSize(board.settings.quoteSize ?? 20);
            setEnableMotionBlur(board.settings.enableMotionBlur ?? false);
            setMotionBlurIntensity(board.settings.motionBlurIntensity ?? 0.5);
            setShaderItemId(board.settings.shaderItemId || null);
        }

        setCurrentBoardId(board.id);
        setViewMode('editor');
    };

    const handleCreateNew = () => {
        setItems([]);
        setTitle('');
        setAuthor('');
        setCurrentBoardId(null);
        setViewMode('editor');
    };

    const handleAiGenerate = async () => {
        const currentImageUrls = items
            .filter(item => item.type === 'image')
            .map(item => item.content);

        if (currentImageUrls.length === 0) {
            alert("Please add at least one image to the board first!");
            return;
        }

        setIsGeneratingAI(true);


        const newId = Math.random().toString(36).substr(2, 9);

        const placeholderItem: BoardItem = {
            id: newId,
            type: 'image',
            content: '', // Empty content for placeholder
            x: 50, // Center X
            y: 50, // Center Y
            rotation: 0,
            zIndex: globalZIndex + 1,
            width: 300, // Fixed width for placeholder
            height: 400, // Fixed height for placeholder
            aspectRatio: 0.75,
            isLoading: true // Mark as loading
        };

        setGlobalZIndex(prev => prev + 1);
        setItems(prev => [...prev, placeholderItem]);

        // 2. Generate Image
        const generatedImage = await generateMoodImageFromBoard(currentImageUrls);

        if (generatedImage) {
            // 3. Update Item with Result
            setItems(prev => prev.map(item => {
                if (item.id === newId) {
                    return {
                        ...item,
                        content: generatedImage,
                        isLoading: false,
                        isGenerated: true // Mark as generated
                    };
                }
                return item;
            }));

            // Add to magical items list to trigger animation
            setMagicalItems(prev => [...prev, newId]);
            setTimeout(() => {
                setMagicalItems(prev => prev.filter(id => id !== newId));
            }, 5000);

            updatePaletteFromAllImages([generatedImage]);
            if (layoutMode === 'grid') {
                // Re-layout grid with the new item fully loaded
                // We need to wait a tick for state update or just pass the new list
                // For simplicity, we'll just trigger a re-layout effect or let the next render handle it
                // But since reLayoutGrid uses 'items' state, we might need to pass the new list manually if we want instant update
                // So we construct the new list manually for reLayoutGrid
                const updatedList = [...items, { ...placeholderItem, content: generatedImage, isLoading: false, isGenerated: true }];
                reLayoutGrid(updatedList);
            }
        } else {
            alert("Could not generate image. Please check your API key and try again.");
            // Remove placeholder on failure
            setItems(prev => prev.filter(item => item.id !== newId));
        }

        setIsGeneratingAI(false);
    };

    const handleGenerateDescription = async () => {
        const currentImageUrls = items
            .filter(item => item.type === 'image')
            .map(item => item.content);

        if (currentImageUrls.length === 0) {
            alert("Add some images first!");
            return;
        }

        setIsGeneratingDescription(true);
        const description = await generateBoardDescription(currentImageUrls);

        if (description) {
            setAboutText(description);
        } else {
            alert("Could not generate description.");
        }
        setIsGeneratingDescription(false);
    };

    const addQuote = () => {

        const gridData = getSmartPos(items.length, layoutMode);
        // Fallback to window dimensions
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;
        const pixelWidth = (gridData.widthPercent / 100) * containerWidth;
        const pixelHeight = gridData.heightPercent ? (gridData.heightPercent / 100) * containerHeight : undefined;
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

        const newItem: BoardItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'text',
            content: `"${randomQuote.text}"`,
            author: randomQuote.author,
            x: gridData.x,
            y: gridData.y,
            rotation: gridData.rotation,
            zIndex: globalZIndex + 1,
            width: layoutMode === 'grid' ? pixelWidth : 260,
            height: pixelHeight,
            aspectRatio: 0.6
        };

        setGlobalZIndex(prev => prev + 1);
        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        if (layoutMode === 'grid') reLayoutGrid(updatedItems);
    };

    const reLayoutGrid = (currentItems: BoardItem[]) => {
        // Fallback to window dimensions
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;

        const cols = windowWidth < 640 ? 2 : windowWidth < 1024 ? 3 : 5;
        const gap = 3; // % horizontal gap
        const cellWidth = (90 - (gap * (cols - 1))) / cols; // %

        // Calculate gap in pixels based on container width to insure uniform spacing
        const gapPx = (gap / 100) * containerWidth;
        const gapVerticalPercent = (gapPx / containerHeight) * 100;

        // Track height of each column in %
        // Start Y at 10%
        const colHeights = new Array(cols).fill(10);

        // Calculate centered start X
        const gridTotalWidth = (cols * cellWidth) + ((cols - 1) * gap);
        const startX = (100 - gridTotalWidth) / 2;

        setItems(currentItems.map((item, index) => {
            const col = index % cols;
            const x = startX + (col * (cellWidth + gap));
            const y = colHeights[col];

            // Calculate pixel dimensions
            const widthPx = (cellWidth / 100) * containerWidth;
            let heightPx = item.height || widthPx; // Default fallback

            // Calculate height based on aspect ratio if available
            // For images/videos/pdfs, we prioritize aspect ratio to maintain original visuals
            if ((item.type === 'image' || item.type === 'video' || item.type === 'pdf') && item.aspectRatio) {
                heightPx = widthPx * item.aspectRatio;
            } else if (item.aspectRatio) {
                // For other items with aspect ratio (like text maybe?)
                heightPx = widthPx * item.aspectRatio;
            } else if (item.type === 'text') {
                // Estimate text height logic or keep existing
                // Text items usually benefit from their own height, but in grid we width-constrain them.
                // We'll let them keep their current height if it seems reasonable, or recalculate.
                // Ideally text height adjusts to content. 
                // For now, let's trust the item's stored height or a default approximation.
                // But if width changes, height should change. Text reflows.
                // This is hard to calculate exactly without DOM.
                // We'll approximate or assume the user has resized it if it was manual.
                // If it's a new item, it might be tricky.
                // Let's use a safe fallback.
                if (!item.height) heightPx = widthPx * 0.6; // Default aspect for text
            }

            const heightPercent = (heightPx / containerHeight) * 100;

            // Update column height for next item in this column
            colHeights[col] += heightPercent + gapVerticalPercent;

            return {
                ...item,
                x,
                y,
                rotation: 0,
                width: widthPx,
                height: heightPx
            };
        }));
    };

    const toggleLayoutMode = (mode: 'organic' | 'grid' | 'animate') => {
        // FIX: Allow clicking same mode to re-shuffle layout
        // if (layoutMode === mode) return; 

        setLayoutMode(mode);
        if (mode === 'animate') {
            setActiveIndex(0);
            setIsSidebarOpen(false);
            return;
        }

        // Stabilize shader before shuffling if not set
        if (!shaderItemId && items.length > 0) {
            setShaderItemId(items[0].id);
        }

        // Shuffle items for variety
        const itemsToLayout = [...items].sort(() => Math.random() - 0.5);

        if (mode === 'grid') {
            reLayoutGrid(itemsToLayout);
        } else if (mode === 'organic') {
            setItems(itemsToLayout.map((item, index) => {
                const pos = getOrganicPos(index);
                return { ...item, ...pos, width: item.manualWidth || 220, height: undefined };
            }));
        }
    };

    const cycleFonts = () => {
        setCurrentFontIndex((prev) => (prev + 1) % FONTS.length);
    };

    const bringToFront = (id: string) => {
        setGlobalZIndex(prev => {
            const newZ = prev + 1;
            setItems(items.map(item => item.id === id ? { ...item, zIndex: newZ } : item));
            return newZ;
        });
    };

    const removeItem = (id: string) => {
        const updated = items.filter(i => i.id !== id);
        setItems(updated);
        if (layoutMode === 'grid') reLayoutGrid(updated);
    };

    const handleRotateStart = (e: React.PointerEvent, id: string, initialRotation: number) => {
        e.stopPropagation();
        e.preventDefault();


        const item = items.find(i => i.id === id);
        if (!item) return;

        // Calculate center of the item
        const rect = (e.target as HTMLElement).closest('.group')?.getBoundingClientRect();
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const baseRotation = initialRotation;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
            const deltaAngle = currentAngle - startAngle;

            setItems(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, rotation: baseRotation + deltaAngle };
                }
                return item;
            }));
        };

        const onPointerUp = () => {

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const handleResizeStart = (e: React.PointerEvent, id: string, initialWidth: number, aspectRatio?: number) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingId(id);
        const startX = e.clientX;
        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(100, initialWidth + deltaX);
            setItems(prev => prev.map(item => {
                if (item.id === id) {
                    const newHeight = (item.type === 'image' || item.type === 'video') && aspectRatio ? newWidth * aspectRatio : item.height;
                    return { ...item, width: newWidth, height: newHeight, manualWidth: newWidth };
                }
                return item;
            }));
        };
        const onPointerUp = () => {
            setResizingId(null);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const updateItemContent = (id: string, newContent: string, newAuthor?: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, content: newContent, author: newAuthor ?? item.author };
            }
            return item;
        }));
    };



    const handleTourStepChange = (step: number) => {
        // Only automate sidebar on mobile
        if (windowWidth >= 768) return;

        if (step === 0) {
            // Step 0: Welcome (Canvas) -> Close sidebar
            setIsSidebarOpen(false);
        } else if (step === 1) {
            // Step 1: AI Description (Sidebar item) -> Open sidebar
            setIsSidebarOpen(true);
        } else if (step >= 2) {
            // Step 2+: Dock items -> Close sidebar
            setIsSidebarOpen(false);
        }
    };

    // --- BACKGROUND SHUFFLE FOR SHOW MODE ---
    useEffect(() => {
        let interval: any;
        if (layoutMode === 'animate' && !isPaused) {
            // REMOVED initial shuffle to maintain continuity

            // Shuffle every 8 seconds
            interval = setInterval(() => {
                updatePaletteFromAllImages([], true);
            }, 8000);
        }
        return () => clearInterval(interval);
    }, [layoutMode, isPaused, items]);

    return (
        <div
            className="flex items-center justify-center w-full h-screen bg-[#E5E5EA] overflow-hidden font-sans text-[#1D1D1F] relative"
            style={{ fontFamily: FONTS[currentFontIndex].family }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            <AnimatePresence>
                {isDraggingOver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[9999] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 transform scale-110">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                                <FileImage size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Drop files here</h3>
                            <p className="text-gray-500 font-medium">Add images, videos, audio, or PDFs</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Styles />

            <div ref={exportWrapperRef} className={`w-full h-full flex items-center justify-center ${layoutMode === 'animate' ? 'p-0' : 'p-0 md:p-12'}`}>
                {isProcessing && <LoadingOverlay message="Capturing moodboard..." progress={progress} />}
                <div
                    id="moodboard-canvas"
                    className={`relative w-full h-full shadow-2xl overflow-hidden flex flex-row transition-all duration-500 ${layoutMode === 'animate' ? '' : 'max-w-[1800px] md:aspect-[16/10]'}`}
                    style={{
                        // Reverted to simple background logic (MeshGradient handles gradient mode)
                        background: bgMode === 'solid' ? background : '#FFFFFF',
                        borderRadius: (windowWidth < 768 || layoutMode === 'animate') ? '0px' : `${dashboardRadius}px`
                    }}
                >
                    <AnimatePresence mode='popLayout'>
                        {/* Restore MeshGradient in Show mode */}
                        {bgMode === 'gradient' && !isExporting && (
                            <motion.div
                                key="mesh"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-0"
                                style={{
                                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
                                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                                }}
                            >
                                <MeshGradient palette={palette} />
                            </motion.div>
                        )}
                        {bgMode === 'gradient' && isExporting && (
                            <div className="absolute inset-0 z-0 opacity-30" style={{ background: `radial-gradient(circle at 20% 20%, ${palette[0]} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${palette[1]} 0%, transparent 50%), radial-gradient(circle at 50% 50%, ${palette[2]} 0%, transparent 50%)` }} />
                        )}

                        {/* --- SOFT GRID OVERLAY --- */}
                        {/* --- SOFT GRID OVERLAY --- */}
                        {showGrid && (
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-30"
                                style={{
                                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
                                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                                }}
                            >
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: gridType === 'square' ? `
                                            linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
                                            linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)
                                        ` : `
                                            radial-gradient(circle, rgba(0,0,0,0.3) 2px, transparent 2px)
                                        `,
                                        backgroundSize: '40px 40px'
                                    }}
                                />
                            </div>
                        )}

                        {bgMode === 'solid' && background !== '#FFFFFF' && (
                            <motion.div key="solid" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0" style={{ backgroundColor: background }} />
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {isLoading && <LoadingCards />}
                    </AnimatePresence>

                    {!isExporting && !isSidebarOpen && (
                        <button
                            id="sidebar-toggle"
                            onClick={() => setIsSidebarOpen(true)}
                            className="absolute top-6 left-6 z-50 p-2 bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-xl transition-all shadow-sm text-gray-600 hover:scale-105"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: windowWidth < 768 ? "100%" : "20%", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="h-full flex flex-col p-8 border-r border-black/5 relative z-20 bg-[#f5f5f5]"
                            >
                                <div className="mb-8 mt-0 flex items-center justify-between">
                                    <img src={MoodLogo} alt="Mood Logo" className="w-32 h-32" />
                                    {!isExporting && (
                                        <button
                                            onClick={() => setIsSidebarOpen(false)}
                                            className="p-2 bg-black/5 hover:bg-black/10 rounded-xl transition-all text-gray-500 hover:text-black"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                    )}
                                </div>
                                <div className="mb-8">
                                    {isExporting ? (
                                        <div className="text-3xl font-normal tracking-tight text-gray-900 w-full mb-2 leading-tight">{title || "Visual Exploration 01"}</div>
                                    ) : (
                                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visual Exploration 01" className="text-3xl font-normal tracking-tight text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-400/50 w-full mb-2 leading-tight" />
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-medium uppercase tracking-wide opacity-50">By</span>
                                        {isExporting ? (
                                            <div className="font-semibold text-gray-900">{author || "Studio Name"}</div>
                                        ) : (
                                            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Studio Name" className="font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-400/50" />
                                        )}
                                    </div>
                                </div>
                                <div className="mb-8 flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[11px] font-medium text-gray-500 tracking-wide opacity-60" style={{ fontFamily: "'Public Sans', sans-serif" }}>Description</h3>
                                        {!isExporting && (
                                            <button
                                                id="tour-ai-desc" // Tour Target
                                                onClick={handleGenerateDescription}
                                                disabled={isGeneratingDescription}
                                                className={`p-1.5 rounded-full transition-all ${isGeneratingDescription ? 'bg-purple-100 text-purple-500' : 'hover:bg-purple-50 text-gray-400 hover:text-purple-500'}`}
                                                title="Auto-generate description"
                                            >
                                                <MagicIcon size={12} className={isGeneratingDescription ? "animate-spin" : ""} />
                                            </button>
                                        )}
                                    </div>
                                    {isExporting ? (
                                        <div className="w-full h-full text-lg font-normal text-gray-800 leading-relaxed whitespace-pre-wrap">{aboutText || "A curated collection exploring nature and technology."}</div>
                                    ) : isGeneratingDescription ? (
                                        <div className="w-full h-full flex flex-col justify-center space-y-2 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                        </div>
                                    ) : (
                                        <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="A curated collection exploring nature and technology." className="w-full h-full text-lg font-normal text-gray-800 leading-relaxed bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-gray-400/50" />
                                    )}
                                </div>
                                <div className="mb-8">
                                    <h3 className="text-[11px] font-medium text-gray-500 tracking-wide mb-3 opacity-60" style={{ fontFamily: "'Public Sans', sans-serif" }}>Keywords</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, i) => (
                                            isExporting ? (
                                                <div key={i} className="px-3 py-1.5 bg-white/50 text-gray-800 rounded-lg text-xs font-medium border border-black/5 w-full text-left">{tag || "Tag"}</div>
                                            ) : (
                                                <input key={i} value={tag} onChange={(e) => { const newTags = [...tags]; newTags[i] = e.target.value; setTags(newTags); }} placeholder="Tag" className="px-3 py-1.5 bg-white/40 text-gray-800 rounded-lg text-xs font-medium border border-black/5 shadow-sm outline-none w-full text-left backdrop-blur-md focus:bg-white placeholder:text-gray-400/50" />
                                            )
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-[11px] font-medium text-gray-500 tracking-wide mb-3 opacity-60" style={{ fontFamily: "'Public Sans', sans-serif" }}>Palette</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {palette.map((color, i) => (
                                            <div
                                                key={i}
                                                className="aspect-square rounded-xl border border-black/5 relative overflow-hidden shadow-sm group cursor-pointer"
                                                onClick={() => navigator.clipboard.writeText(color)}
                                                title="Copy Hex"
                                            >
                                                <div className="w-full h-full" style={{ backgroundColor: color }} />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Copy size={12} className="text-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- RIGHT CANVAS --- */}
                    <div className="flex-1 h-full relative z-10">
                        {/* --- DYNAMIC BACKGROUND (Fixed behind scrollable canvas) --- */}
                        {isShaderMode && items.length > 0 && (
                            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                                <ShaderBackground
                                    isActive={true}
                                    imageUrl={layoutMode === 'animate'
                                        ? (items[activeIndex] || items[0]).content
                                        : (items.find(i => i.id === shaderItemId) || items[0]).content
                                    }
                                    isVideo={(layoutMode === 'animate'
                                        ? (items[activeIndex] || items[0])
                                        : (items.find(i => i.id === shaderItemId) || items[0])
                                    ).type === 'video'}
                                    onColorsExtracted={setActiveShaderColors}
                                    enableMotionBlur={enableMotionBlur}
                                    motionBlurIntensity={motionBlurIntensity}
                                    isPaused={isPaused}
                                    shaderMode={shaderMode}
                                />
                            </div>
                        )}

                        <div id="moodboard-canvas" ref={containerRef} className={`w-full h-full relative scroll-smooth custom-scrollbar ${layoutMode === 'grid' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} z-10`} style={{ perspective: '1200px' }}>
                            {/* Scroll Spacer for Grid Mode */}
                            {layoutMode === 'grid' && (
                                <div style={{
                                    height: `${Math.max(100, 10 + (Math.ceil(items.length / 5) * 25))}%`,
                                    width: '1px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    pointerEvents: 'none'
                                }} />
                            )}
                            {/* ... (rest of the component) */}

                            {items.length === 0 && !isLoading && hasSeenTour && (
                                <motion.div
                                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-none"
                                >
                                    <div className="p-12 rounded-3xl backdrop-blur-xl bg-white/30 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] border border-white/20 pointer-events-auto">
                                        <InteractiveQuote />
                                    </div>
                                </motion.div>
                            )}

                            {/* --- SHOW MODE VS EDIT MODES --- */}
                            {layoutMode === 'animate' && items.length > 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                                    <AnimatePresence mode="popLayout">
                                        {items.map((item, index) => {
                                            const len = items.length;
                                            // Calculate circular offset
                                            let offset = (index - activeIndex + len) % len;
                                            // Normalize offset to be shortest distance (-len/2 to len/2)
                                            if (offset > len / 2) offset -= len;

                                            // Debug log for offset 0
                                            if (offset === 0) {
                                                console.log("Rendering Main Item:", item.id);
                                            }

                                            // Only render the immediate Previous, Center, and Next items
                                            // This ensures items unmount before wrapping around, preventing the "fly across screen" glitch
                                            if (offset < -1 || offset > 1) return null;

                                            // Determine styles based on offset
                                            let yOffset = 0;
                                            let scale = 1;
                                            let opacity = 1;
                                            let zIndex = 0;
                                            let blur = 0;
                                            let pointerEvents = 'none'; // Default to none

                                            if (offset === -1) {
                                                // Previous (Top)
                                                yOffset = -500;
                                                scale = 0.6;
                                                opacity = 0.4;
                                                zIndex = 10;
                                                blur = 5;
                                            } else if (offset === 0) {
                                                // Main (Center)
                                                yOffset = 0;
                                                scale = 1.1;
                                                opacity = 1;
                                                zIndex = 20;
                                                blur = 0;
                                                pointerEvents = 'auto'; // Enable interaction for Main
                                            } else if (offset === 1) {
                                                // Next (Bottom)
                                                yOffset = 500;
                                                scale = 0.6;
                                                opacity = 0.4;
                                                zIndex = 10;
                                                blur = 5;
                                            }

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    // layoutId={item.id} // REMOVED to prevent conflict with centering

                                                    // Initial state matches the "enter" position (from BOTTOM)
                                                    initial={{ y: 1000, scale: 0.4, opacity: 0, x: '-50%' }}
                                                    animate={{
                                                        y: yOffset,
                                                        scale: scale,
                                                        opacity: opacity,
                                                        zIndex: zIndex,
                                                        filter: `blur(${blur}px)`,
                                                        x: '-50%' // Explicitly maintain centering
                                                    }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 40,
                                                        damping: 15,
                                                        mass: 1
                                                    }}
                                                    // Exit to TOP
                                                    exit={{ y: -1000, opacity: 0, scale: 0.4, transition: { duration: 0.5 } }}
                                                    className="absolute w-[400px] max-w-[80%] max-h-[60vh] flex flex-col items-center justify-center"
                                                    style={{
                                                        // transformStyle: 'preserve-3d', // Moved to inner motion.div
                                                        aspectRatio: item.type === 'pdf' ? 3 / 4 : (item.aspectRatio ? 1 / item.aspectRatio : 3 / 4),
                                                        // Fixed centering
                                                        left: '50%',
                                                        x: '-50%', // Initial CSS state
                                                        pointerEvents: pointerEvents as any, // Dynamic pointer events
                                                        perspective: '1000px'
                                                    }}
                                                >
                                                    {/* Content */}
                                                    <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                                                        {item.isLoading ? (
                                                            <div className="w-full h-full bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden rounded-xl border border-white/50 shadow-xl">
                                                                <div className="magical-glow opacity-50"></div>
                                                                <Loader className="w-8 h-8 text-purple-600 animate-spin mb-3 relative z-10" />
                                                                <span className="text-xs text-purple-800 font-medium relative z-10">Dreaming...</span>
                                                            </div>
                                                        ) : (item.type === 'image' || item.type === 'video') ? (
                                                            <motion.div
                                                                className={`transition-all w-full h-full`}
                                                                style={{
                                                                    transformStyle: 'preserve-3d',
                                                                    cursor: 'pointer'
                                                                }}
                                                                // Floating animation for Main image only
                                                                animate={offset === 0 ? {
                                                                    y: [0, -25, 0],
                                                                    rotate: [0, 2, -2, 0],
                                                                    scale: [1, 1.02, 1],
                                                                } : {}}
                                                                transition={offset === 0 ? {
                                                                    duration: 7,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut"
                                                                } : {}}
                                                                // Hover effect for Main image only
                                                                whileHover={offset === 0 ? {
                                                                    scale: 1.05,
                                                                    rotateX: 10,
                                                                    rotateY: 10,
                                                                    boxShadow: "0 40px 80px -12px rgba(0,0,0,0.6)"
                                                                } : {}}
                                                            >
                                                                {/* FLIP CONTAINER - Replaced with Universal Component */}
                                                                <FlippableImage
                                                                    item={item}
                                                                    isFlipped={flippedItems.has(item.id)}
                                                                    onToggleFlip={toggleFlip}
                                                                    showBorders={showBorders}
                                                                    imageRadius={imageRadius}
                                                                    shaderColors={activeShaderColors}
                                                                    isShaderActive={isShaderMode}
                                                                />
                                                            </motion.div>

                                                        ) : item.type === 'pdf' ? (
                                                            <div className="w-full h-full bg-white flex flex-col items-center justify-center border border-gray-200">
                                                                <div className="text-lg font-bold text-gray-400">PDF</div>
                                                            </div>
                                                        ) : (
                                                            <div className={`border border-white/60 p-8 shadow-2xl w-full h-full bg-white/80 backdrop-blur-xl flex flex-col justify-center`}
                                                                style={{
                                                                    borderRadius: `${imageRadius}px`,
                                                                }}>
                                                                <div className="text-[12px] font-bold tracking-widest text-gray-500 uppercase mb-4">{item.author}</div>
                                                                <div
                                                                    className="font-medium text-gray-800 leading-snug"
                                                                    style={{ fontSize: `${quoteSize}px` }}
                                                                >
                                                                    {item.content}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {items.map((item, index) => (
                                        <BoardItem
                                            key={item.id}
                                            item={item}
                                            index={index} // Pass index for staggered animation
                                            isExporting={isExporting}
                                            magicalItems={magicalItems}
                                            removeItem={removeItem}
                                            handleResizeStart={handleResizeStart}
                                            handleRotateStart={handleRotateStart}
                                            imageRadius={imageRadius}
                                            showBorders={showBorders}
                                            borderThickness={borderThickness}
                                            quoteSize={quoteSize}
                                            updateItemContent={updateItemContent}
                                            bringToFront={bringToFront}
                                            isActive={layoutMode === 'animate' && index === activeIndex}
                                            resizingId={resizingId}

                                            containerRef={containerRef}
                                            isFlipped={flippedItems.has(item.id)}
                                            onToggleFlip={toggleFlip}
                                            layoutMode={layoutMode} // Pass layoutMode down
                                            shaderColors={activeShaderColors}
                                            isShaderActive={isShaderMode}
                                        />
                                    ))}
                                </AnimatePresence>
                            )}

                        </div>

                        {/* --- INSPIRATION QUOTE --- */}
                        {!isExporting && layoutMode !== 'animate' && (
                            <div className="absolute bottom-8 left-8 z-[100]">
                                <InspirationQuote />
                            </div>
                        )}
                    </div>

                    {/* --- COMMUNITY GALLERY OVERLAY --- */}
                    {viewMode === 'community' && (
                        <div className="absolute inset-0 z-[9000] bg-[#f8f9fa]">
                            <CommunityGallery
                                onLoadBoard={handleLoadBoard}
                                onCreateNew={handleCreateNew}
                            />
                        </div>
                    )}

                    {/* --- DOCK --- */}


                    {/* --- DOCK --- */}
                    {
                        !isExporting && (
                            <div id="dock-controls" className="absolute bottom-4 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:w-auto z-[9999] flex flex-col items-end gap-4 pointer-events-none">
                                <AnimatePresence>
                                    {showSettings && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5, y: 40, x: 40, filter: "blur(10px)" }}
                                            animate={{ opacity: 1, scale: 1, y: 0, x: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, scale: 0.5, y: 40, x: 40, filter: "blur(10px)" }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            style={{ transformOrigin: "55px bottom" }}
                                            className="flex flex-col gap-4 p-5 rounded-3xl bg-white/60 backdrop-blur-2xl border-[3px] border-white/20 shadow-2xl w-80 pointer-events-auto"
                                        >
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dashboard Radius</span><span className="text-gray-900 font-mono text-xs">{dashboardRadius}px</span></div>
                                                    <input type="range" min="0" max="60" value={dashboardRadius} onChange={(e) => setDashboardRadius(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#8A673F] hover:bg-gray-300 transition-colors" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Radius</span><span className="text-gray-900 font-mono text-xs">{imageRadius}px</span></div>
                                                    <input type="range" min="0" max="60" value={imageRadius} onChange={(e) => setImageRadius(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#8A673F] hover:bg-gray-300 transition-colors" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Border Thickness</span><span className="text-gray-900 font-mono text-xs">{borderThickness}px</span></div>
                                                    <input type="range" min="0" max="40" value={borderThickness} onChange={(e) => setBorderThickness(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#8A673F] hover:bg-gray-300 transition-colors" />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show Grid</span>
                                                    <div className="flex gap-2 items-center">
                                                        {showGrid && (
                                                            <button
                                                                onClick={() => setGridType(prev => prev === 'square' ? 'dot' : 'square')}
                                                                className="text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-[#8A673F] transition-colors mr-2"
                                                            >
                                                                {gridType === 'square' ? 'Square' : 'Dot'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setShowGrid(!showGrid)}
                                                            className={`w-10 h-5 rounded-full relative transition-colors ${showGrid ? 'bg-[#8A673F]' : 'bg-gray-200'}`}
                                                        >
                                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${showGrid ? 'left-6' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-black/5 w-full" />
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Background</span>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { setBgMode('solid'); setIsShaderMode(false); }} className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'solid' ? 'bg-[#8A673F] text-white' : 'bg-white/40 text-gray-600 hover:bg-white/60'}`}>Solid</button>
                                                            <button onClick={() => { setBgMode('gradient'); setIsShaderMode(false); }} className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'gradient' ? 'bg-[#8A673F] text-white' : 'bg-white/40 text-gray-600 hover:bg-white/60'}`}>Gradient</button>
                                                            <button onClick={() => { setBgMode('shader'); setIsShaderMode(true); }} className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'shader' ? 'bg-[#8A673F] text-white' : 'bg-white/40 text-gray-600 hover:bg-white/60'}`}>Shader</button>
                                                        </div>
                                                    </div>
                                                    {bgMode === 'gradient' && (
                                                        <div className="flex justify-between gap-2 pt-1">
                                                            {[0, 1, 2].map((i) => (
                                                                <motion.div key={i} className="w-8 h-8 rounded-full border border-black/10 relative overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform">
                                                                    <input type="color" value={palette[i] || '#ffffff'} onChange={(e) => updatePaletteColor(i, e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0" />
                                                                    <div className="w-full h-full" style={{ backgroundColor: palette[i] }} />
                                                                </motion.div>
                                                            ))}
                                                            <button onClick={() => updatePaletteFromAllImages([], true)} className="ml-auto text-[10px] text-gray-500 hover:text-[#8A673F] flex items-center gap-1 px-2 py-1 rounded hover:bg-[#8A673F]/10 transition-colors"><RefreshCw size={10} /> Shuffle</button>
                                                        </div>
                                                    )}
                                                    {bgMode === 'solid' && (
                                                        <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                                                            {['#FFFFFF', '#F3F4F6', '#000000', '#1a1a1a'].map(c => (<button key={c} onClick={() => setBackground(c)} className="w-6 h-6 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: c }} />))}
                                                            <div className="w-6 h-6 rounded-full border border-black/10 relative overflow-hidden"><input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 opacity-0 cursor-pointer" /><div className="w-full h-full" style={{ backgroundColor: background }} /></div>
                                                        </div>
                                                    )}
                                                    {bgMode === 'shader' && (
                                                        <div className="space-y-2 pt-2 border-t border-black/5 mt-2">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-medium text-gray-600">Mode</span>
                                                                <div className="flex bg-gray-200 rounded-lg p-0.5">
                                                                    <button
                                                                        onClick={() => setShaderMode('soft')}
                                                                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${shaderMode === 'soft' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        Soft
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShaderMode('extreme')}
                                                                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${shaderMode === 'extreme' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        Extreme
                                                                    </button>
                                                                </div>
                                                            </div>



                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-medium text-gray-600">Visual</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const candidates = items.filter(i => i.type === 'image' || i.type === 'video');
                                                                        if (candidates.length > 0) {
                                                                            const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
                                                                            setShaderItemId(randomItem.id);
                                                                        }
                                                                    }}
                                                                    className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm text-gray-800 hover:bg-gray-50 flex items-center gap-1"
                                                                >
                                                                    <Shuffle size={10} />
                                                                    Shuffle
                                                                </button>
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium text-gray-600">Motion Blur</span>
                                                                <button
                                                                    onClick={() => setEnableMotionBlur(!enableMotionBlur)}
                                                                    className={`w-10 h-5 rounded-full relative transition-colors ${enableMotionBlur ? 'bg-[#8A673F]' : 'bg-gray-200'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableMotionBlur ? 'left-6' : 'left-1'}`} />
                                                                </button>
                                                            </div>
                                                            {enableMotionBlur && (
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-[10px] text-gray-400">
                                                                        <span>Intensity</span>
                                                                        <span>{Math.round(motionBlurIntensity * 100)}%</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="1"
                                                                        step="0.01"
                                                                        value={motionBlurIntensity}
                                                                        onChange={(e) => setMotionBlurIntensity(parseFloat(e.target.value))}
                                                                        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#8A673F] hover:bg-gray-300 transition-colors"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="h-px bg-black/5 w-full" />
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Elements</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center"><span className="text-xs font-medium text-gray-600">Text Size</span><span className="text-[10px] font-mono text-gray-500">{quoteSize}px</span></div>
                                                        <input type="range" min="12" max="48" value={quoteSize} onChange={(e) => setQuoteSize(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#8A673F] hover:bg-gray-300 transition-colors" />
                                                    </div>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs font-medium text-gray-600">Image Frames</span>
                                                        <button onClick={() => setShowBorders(!showBorders)} className={`w-12 h-6 rounded-full p-1 transition-colors ${showBorders ? 'bg-[#8A673F]' : 'bg-gray-200'}`}><div className={`w-4 h-4 rounded-full shadow-sm transition-transform ${showBorders ? 'translate-x-6 bg-white' : 'bg-white'}`} /></button>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs font-medium text-gray-600">Typography</span>
                                                        <button onClick={cycleFonts} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-medium text-gray-600 transition-colors">
                                                            <CaseUpper size={12} />
                                                            <span>Change Font</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* UPDATED MENU: Frosted Light Theme */}
                                <div className="flex items-center gap-2 p-2 rounded-3xl bg-white/60 backdrop-blur-2xl shadow-2xl border-[3px] border-white/20 max-w-full pointer-events-auto no-scrollbar transition-all duration-500 ease-in-out">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {isDockExpanded && (
                                            <motion.div
                                                initial={{ width: 0, opacity: 0, overflow: "hidden" }}
                                                animate={{ width: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                                                exit={{ width: 0, opacity: 0, overflow: "hidden" }}
                                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                                className="flex items-center gap-2"
                                            >
                                                <div className="relative group flex items-center">
                                                    <DockButton icon={Plus} />
                                                    {/* Hover Menu for Add */}
                                                    {/* Hover Menu for Add */}
                                                    <div className="absolute left-0 bottom-full pb-2 flex flex-col opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                                        <div className="flex flex-col gap-2 bg-white/80 backdrop-blur-xl p-2 rounded-xl border border-white/20 shadow-xl">
                                                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 rounded-lg transition-colors text-sm font-medium text-gray-700 whitespace-nowrap">
                                                                <FileImage size={16} />
                                                                <span>Add Files</span>
                                                            </button>
                                                            <button onClick={addQuote} className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 rounded-lg transition-colors text-sm font-medium text-gray-700 whitespace-nowrap">
                                                                <Type size={16} />
                                                                <span>Add Text</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input type="file" multiple accept="image/*,video/mp4,audio/mpeg,audio/mp3,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                                </div>

                                                {/* UPDATED: Gen Ref Image Button with Glow */}
                                                <DockButton
                                                    id="tour-ai-image" // Tour Target
                                                    onClick={handleAiGenerate}
                                                    icon={isGeneratingAI ? Loader : MagicIcon}
                                                    label={isGeneratingAI ? "Generating..." : "Gen Ref Image"}
                                                    active={isGeneratingAI}
                                                    className="ai-button-glow" // Apply the glow class here
                                                />
                                                {/* Add a spinner animation to the icon if generating */}
                                                {isGeneratingAI && (
                                                    <style>{`
                                    .lucide-loader { animation: spin 2s linear infinite; }
                                    @keyframes spin { 100% { transform: rotate(360deg); } }
                                `}</style>
                                                )}

                                                <div className="w-px h-8 bg-black/10 mx-1" />
                                                {/* Community Button */}
                                                <DockButton
                                                    onClick={() => setViewMode(prev => prev === 'community' ? 'editor' : 'community')}
                                                    icon={Users}
                                                    label="Community"
                                                    active={viewMode === 'community'}
                                                />
                                                <div className="w-px h-8 bg-black/10 mx-1" />

                                                <div className="w-px h-8 bg-black/10 mx-1" />
                                                <DockButton onClick={() => setShowSettings(!showSettings)} icon={SlidersHorizontal} label="Style" active={showSettings} />
                                                {/* ADDED ANIMATE BUTTON BACK */}
                                                <div id="tour-layout" className="flex gap-2">
                                                    <DockButton onClick={() => { toggleLayoutMode('organic'); setViewMode('editor'); }} icon={InfinityIcon} label="Dynamic" active={layoutMode === 'organic' && viewMode === 'editor'} />
                                                    <DockButton onClick={() => { toggleLayoutMode('grid'); setViewMode('editor'); }} icon={Grid2X2} label="Grid" active={layoutMode === 'grid' && viewMode === 'editor'} />
                                                </div>
                                                <DockButton
                                                    onClick={() => {
                                                        setViewMode('editor');
                                                        if (layoutMode === 'animate') {
                                                            setIsPaused(!isPaused);
                                                        } else {
                                                            toggleLayoutMode('animate');
                                                            setIsPaused(false);
                                                        }
                                                    }}
                                                    icon={layoutMode === 'animate' && !isPaused ? Pause : Play}
                                                    label={layoutMode === 'animate' ? (isPaused ? "Play" : "Pause") : "Show"}
                                                    active={layoutMode === 'animate' && viewMode === 'editor'}
                                                />
                                                <div className="w-px h-8 bg-black/10 mx-1" />
                                                <DockButton onClick={handleSaveToCommunity} icon={Download} label="Save to Community" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <DockButton
                                        onClick={() => setIsDockExpanded(!isDockExpanded)}
                                        icon={isDockExpanded ? ChevronRight : ChevronLeft}
                                        label={isDockExpanded ? "Collapse" : "Expand"}
                                    />
                                </div>
                            </div>
                        )
                    }
                </div >
            </div >
            <TourGuide onStepChange={handleTourStepChange} onComplete={() => setHasSeenTour(true)} />
        </div >
    );
};

export default OrganicMoodboard;