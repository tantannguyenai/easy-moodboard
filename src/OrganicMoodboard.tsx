import React, { useState, useRef, useEffect } from 'react';
// FIX: Added 'type' keyword before Variants to satisfy strict TS rules
import { motion, AnimatePresence, type Variants, usePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
    Download, X, Plus, Type, Settings, Scaling, CaseUpper,
    LayoutGrid, RefreshCw, ChevronLeft, ChevronRight,
    Copy, Play, Pause, Sparkles as MagicIcon, Loader, Wind
} from 'lucide-react';
// Ensure this path matches where you put the file
import { generateMoodImageFromBoard, generateBoardDescription } from './services/imageGenerator';
import MoodLogo from '../easy-moodboard/src/assets/moodlogo.svg';
import { TourGuide } from './components/TourGuide';

// --- Constants ---
const QUOTES = [
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Design is intelligence made visible.", author: "Alina Wheeler" },
    { text: "Less is more.", author: "Mies van der Rohe" },
    { text: "Creativity takes courage.", author: "Henri Matisse" },
    { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
];

const FONTS = [
    { name: "Modern Sans", family: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
    { name: "Elegant Serif", family: "Georgia, Cambria, 'Times New Roman', Times, serif" },
    { name: "Tech Mono", family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    { name: "Clean Rounded", family: "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif" },
    { name: "Classic Print", family: "'Courier New', Courier, monospace" },
];

// --- Types ---
type BoardItem = {
    id: string;
    type: 'image' | 'text';
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
};

// --- STYLES FOR EFFECTS ---
const Styles = () => (
    <style>{`
    @keyframes rainbow-pulse {
      0% { filter: hue-rotate(0deg) blur(8px); opacity: 0.8; }
      50% { filter: hue-rotate(180deg) blur(12px); opacity: 1; transform: scale(1.02); }
      100% { filter: hue-rotate(360deg) blur(8px); opacity: 0.8; }
    }
    @keyframes subtle-glow {
      0% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.5); }
      50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.6), 0 0 25px rgba(139, 92, 246, 0.3); border-color: rgba(139, 92, 246, 0.8); }
      100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.5); }
    }
    .ai-button-glow {
      animation: subtle-glow 3s infinite ease-in-out;
      border: 1px solid rgba(139, 92, 246, 0.5);
    }
    .magical-glow {
      position: absolute;
      inset: -10px;
      border-radius: 20px;
      background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
      background-size: 400%;
      z-index: -1;
      animation: rainbow-pulse 3s linear infinite;
      pointer-events: none;
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
        <Icon size={20} strokeWidth={2} />
        <span className="absolute -top-10 bg-white/80 backdrop-blur-md text-black/80 border border-black/5 shadow-sm text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {label}
        </span>
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
const ParticleExplosion = ({ imageSrc }: { imageSrc: string }) => {
    const particles = [];
    const gridSize = 16; // 16x16 grid = 256 particles

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            particles.push({
                i,
                j,
                // Pre-calculate random physics for each particle
                randomX: (Math.random() - 0.5) * 400, // Slightly reduced range for control
                randomY: (Math.random() - 0.5) * 400 + (Math.random() * 100),
                randomRotate: (Math.random() - 0.5) * 180, // Reduced rotation for smoothness
                randomScale: 0.3 + Math.random() * 0.5,
                duration: 1.2 + Math.random() * 0.8, // Longer, smoother duration
                delay: Math.random() * 0.2 // More delay variance to break grid
            });
        }
    }

    return (
        <div className="absolute inset-0 z-50 pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={`${p.i}-${p.j}`}
                    initial={{
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        y: 0
                    }}
                    animate={{
                        opacity: 0,
                        scale: 0,
                        x: p.randomX,
                        y: p.randomY,
                        rotate: p.randomRotate
                    }}
                    transition={{
                        duration: p.duration,
                        ease: [0.4, 0, 0.2, 1], // Smooth bezier curve
                        delay: p.delay
                    }}
                    className="absolute"
                    style={{
                        top: `${p.i * 6.25}%`,
                        left: `${p.j * 6.25}%`,
                        width: '6.25%',
                        height: '6.25%',
                        backgroundImage: `url(${imageSrc})`,
                        backgroundSize: '1600% 1600%', // 16x grid means 1600% size
                        backgroundPosition: `${p.j * 6.66}% ${p.i * 6.66}%`, // 100 / 15 ≈ 6.666
                        borderRadius: '2px' // Slightly softer edges
                    }}
                />
            ))}
        </div>
    );
};

// --- BOARD ITEM COMPONENT ---
const BoardItem = React.forwardRef(({
    item,
    layoutMode,
    isExporting,
    magicalItems,
    removeItem,
    handleResizeStart,
    imageRadius,
    showBorders,
    quoteSize,
    updateItemContent,
    bringToFront,
    isActive, // for Show mode
    resizingId,
    containerRef,
    index // Added index for staggered animation
}: any, ref: any) => {
    const [isPresent, safeToRemove] = usePresence();

    useEffect(() => {
        if (!isPresent) {
            const timer = setTimeout(safeToRemove, 2000); // 2s duration to match new particle physics
            return () => clearTimeout(timer);
        }
    }, [isPresent, safeToRemove]);

    // If deleted and it's an image, show explosion
    const showExplosion = !isPresent && item.type === 'image';

    // Calculate height to prevent collapse during explosion
    const computedHeight = item.height || (item.type === 'image' && item.aspectRatio ? item.width * item.aspectRatio : 'auto');

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
                rotate: item.rotation,
                zIndex: item.zIndex,
                width: item.width,
                height: computedHeight
            }}
            exit={showExplosion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
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
            dragMomentum={false}
            onDragStart={() => bringToFront(item.id)}
            onPointerDown={() => bringToFront(item.id)}
            style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}px`,
                height: computedHeight !== 'auto' ? `${computedHeight}px` : 'auto'
            }}
            whileHover={!isExporting ? { scale: 1.015, cursor: 'grab', zIndex: 999 } : {}}
            whileDrag={{
                scale: 1.15,
                rotate: 5,
                boxShadow: "0 40px 80px -20px rgba(0, 0, 0, 0.5)",
                cursor: 'grabbing',
                zIndex: 9999
            }}
            className="absolute group"
        >
            {showExplosion ? (
                <ParticleExplosion imageSrc={item.content} />
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
                        <div className="relative w-full h-full">
                            {/* Outer Glow Effect */}
                            <div className="absolute -inset-8 opacity-60 blur-2xl z-0">
                                <MeshGradient palette={['#C084FC', '#818CF8', '#F472B6']} speed={0.5} />
                            </div>

                            {/* Main Card */}
                            <div
                                className="w-full h-full bg-white/20 flex flex-col items-center justify-center relative overflow-hidden border border-white/50 shadow-xl z-10"
                                style={{ borderRadius: `${imageRadius}px` }}
                            >
                                <MeshGradient palette={['#C084FC', '#818CF8', '#F472B6']} speed={0.5} />
                                <div className="absolute inset-0 backdrop-blur-[30px] z-0" />

                                <Loader className="w-8 h-8 text-purple-900 animate-spin mb-3 relative z-10" />
                                <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-xs text-purple-900 font-bold tracking-wide uppercase relative z-10"
                                >
                                    Curating...
                                </motion.span>
                            </div>
                        </div>
                    ) : item.type === 'image' ? (
                        <div
                            className={`transition-all w-full h-full ${showBorders ? 'bg-white p-[8px]' : ''}`}
                            style={{
                                borderRadius: `${imageRadius}px`,
                                boxShadow: '0 12px 24px -8px rgba(0,0,0,0.25)'
                            }}
                        >
                            <img
                                src={item.content}
                                className="pointer-events-none select-none object-cover w-full h-full block"
                                style={{
                                    borderRadius: showBorders ? `${Math.max(0, imageRadius - 6)}px` : `${imageRadius}px`,
                                    objectFit: 'cover'
                                }}
                                crossOrigin="anonymous"
                            />
                            {!isExporting && (
                                <div
                                    onPointerDown={(e) => handleResizeStart(e, item.id, item.width, item.aspectRatio)}
                                    className="absolute bottom-4 right-4 w-8 h-8 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg opacity-0 group-hover:opacity-100 cursor-ew-resize flex items-center justify-center transition-opacity z-50 hover:bg-white"
                                >
                                    <Scaling size={14} className="text-gray-600" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`border border-white/60 p-6 shadow-xl w-full h-full ${isExporting ? 'bg-white/95' : 'bg-white/80 backdrop-blur-xl'}`}
                            style={{
                                borderRadius: `${imageRadius}px`,
                                boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)'
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
                    )}
                </div>
            )}
        </motion.div>
    );
});

const OrganicMoodboard = () => {
    // --- State ---
    const [items, setItems] = useState<BoardItem[]>([]);
    const [globalZIndex, setGlobalZIndex] = useState(10);
    const [layoutMode, setLayoutMode] = useState<'organic' | 'grid' | 'animate'>('organic');
    const [activeIndex, setActiveIndex] = useState(0);
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

    // Style State
    const [dashboardRadius, setDashboardRadius] = useState(32);
    const [imageRadius, setImageRadius] = useState(12);
    const [background, setBackground] = useState('#FFFFFF');
    const [bgMode, setBgMode] = useState<'solid' | 'gradient'>('gradient');

    const [showBorders, setShowBorders] = useState(true);
    const [quoteSize, setQuoteSize] = useState(20);

    const [smartGradient, setSmartGradient] = useState('');
    const [currentFontIndex, setCurrentFontIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false); // New state
    const [resizingId, setResizingId] = useState<string | null>(null);

    // Magical Effect State
    const [magicalItems, setMagicalItems] = useState<string[]>([]);

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

    // --- ANIMATION LOOP ---
    useEffect(() => {
        let interval: any;
        if (layoutMode === 'animate' && items.length > 0 && !isPaused) {
            interval = setInterval(() => {
                setActiveIndex((prev) => (prev + 1) % items.length);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [layoutMode, items.length, isPaused]);

    // --- SHOW MODE VARIANTS ---
    const showVariants: Variants = {
        enter: {
            rotateX: -60,
            y: 80,
            opacity: 0,
            scale: 0.9
        },
        center: {
            rotateX: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            zIndex: 1,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        },
        exit: {
            rotateX: 60,
            y: -80,
            opacity: 0,
            scale: 0.9,
            zIndex: 0,
            transition: {
                duration: 0.6,
                ease: "easeIn"
            }
        }
    };

    // --- Helpers ---


    const updatePaletteFromAllImages = (newImageUrls: string[] = [], randomize: boolean = false) => {
        const currentUrls = items.filter(i => i.type === 'image').map(i => i.content);
        const allUrls = [...currentUrls, ...newImageUrls];

        if (allUrls.length === 0) return;

        const collectedColors: string[] = [];
        const samplesPerImage = Math.ceil(6 / Math.min(allUrls.length, 6));
        let processed = 0;

        let urlsToScan: string[] = [];
        if (randomize) {
            // Pick 6 random images
            const shuffled = [...allUrls].sort(() => 0.5 - Math.random());
            urlsToScan = shuffled.slice(0, 6);
        } else {
            // Pick last 6 images
            urlsToScan = allUrls.slice(-6);
        }

        urlsToScan.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = 50; canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);

                const samplePoints = [[25, 25], [10, 10], [40, 40], [25, 10], [25, 40]];

                for (let i = 0; i < samplesPerImage; i++) {
                    if (collectedColors.length >= 6) break;
                    const pt = samplePoints[i % samplePoints.length];
                    const p = ctx.getImageData(pt[0], pt[1], 1, 1).data;
                    if (p[0] > 245 && p[1] > 245 && p[2] > 245) continue;
                    if (p[0] < 15 && p[1] < 15 && p[2] < 15) continue;
                    collectedColors.push(`rgb(${p[0]}, ${p[1]}, ${p[2]})`);
                }

                processed++;
                if (processed === urlsToScan.length) {
                    while (collectedColors.length < 6) collectedColors.push('#E5E7EB');
                    setPalette(collectedColors);
                    const gradient = `linear-gradient(135deg, ${collectedColors[0]} 0%, ${collectedColors[1]} 100%)`;
                    setSmartGradient(gradient);
                    if (bgMode === 'gradient') setBackground(gradient);
                }
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
            rotation: (Math.random() * 12) - 6,
            heightPercent: undefined,
            scale: 1,
            opacity: 1
        };
    };

    const getGridPos = (index: number, totalCount: number) => {
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

    const getSmartPos = (index: number, totalCount: number, mode = layoutMode) => {
        if (mode === 'organic') return { ...getOrganicPos(index), widthPercent: 20, heightPercent: undefined };
        return getGridPos(index, totalCount);
    };

    // --- HANDLERS ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setIsLoading(true);
        const filesToProcess = Array.from(files).slice(0, 10);
        const newItems: BoardItem[] = [];
        const newUrls: string[] = [];
        const predictedTotal = items.length + filesToProcess.length;
        // Fallback to window dimensions if container is hidden (e.g. behind sidebar on mobile)
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;

        const imagePromises = filesToProcess.map((file, i) => {
            return new Promise<void>((resolve) => {
                const url = URL.createObjectURL(file);
                newUrls.push(url);
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    const gridData = getSmartPos(items.length + i, predictedTotal, layoutMode);
                    const pixelWidth = (gridData.widthPercent / 100) * containerWidth;
                    const pixelHeight = gridData.heightPercent ? (gridData.heightPercent / 100) * containerHeight : undefined;
                    newItems.push({
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
                    resolve();
                };
                img.onerror = () => resolve();
            });
        });

        Promise.all([
            Promise.all(imagePromises),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]).then(() => {
            setGlobalZIndex(prev => prev + newItems.length);
            const updatedItems = [...items, ...newItems];
            setItems(updatedItems);
            updatePaletteFromAllImages(newUrls);
            if (layoutMode === 'grid') reLayoutGrid(updatedItems);
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
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

        // 1. Create Placeholder Item
        const predictedTotal = items.length + 1;
        // const gridData = getSmartPos(items.length, predictedTotal, layoutMode); // Unused
        // const containerWidth = containerRef.current?.clientWidth || 1200; // Unused
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
                        isLoading: false
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
                // However, since we just updated state, the effect might not catch it immediately if we call reLayoutGrid(items)
                // So we construct the new list manually for reLayoutGrid
                const updatedList = [...items, { ...placeholderItem, content: generatedImage, isLoading: false }];
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
        const predictedTotal = items.length + 1;
        const gridData = getSmartPos(items.length, predictedTotal, layoutMode);
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
        const total = currentItems.length;
        // Fallback to window dimensions
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;
        setItems(currentItems.map((item, index) => {
            const pos = getGridPos(index, total);
            return {
                ...item,
                x: pos.x,
                y: pos.y,
                rotation: 0,
                width: (pos.widthPercent / 100) * containerWidth,
                height: (pos.heightPercent! / 100) * containerHeight
            };
        }));
    };

    const toggleLayoutMode = (mode: 'organic' | 'grid' | 'animate') => {
        setLayoutMode(mode);
        if (mode === 'animate') setActiveIndex(0);

        setItems(prev => {
            const shuffledItems = (mode === 'organic' || mode === 'grid') ? [...prev].sort(() => Math.random() - 0.5) : prev;
            const total = shuffledItems.length;
            // Fallback to window dimensions
            const containerWidth = (containerRef.current?.clientWidth || 0) > 0
                ? containerRef.current!.clientWidth
                : window.innerWidth;
            const containerHeight = (containerRef.current?.clientHeight || 0) > 0
                ? containerRef.current!.clientHeight
                : window.innerHeight;

            return shuffledItems.map((item, index) => {
                if (mode === 'grid') {
                    const pos = getGridPos(index, total);
                    return { ...item, ...pos, width: (pos.widthPercent / 100) * containerWidth, height: (pos.heightPercent! / 100) * containerHeight };
                } else if (mode === 'organic') {
                    const pos = getOrganicPos(index);
                    return { ...item, ...pos, width: item.manualWidth || 220, height: undefined };
                } else {
                    return item;
                }
            });
        });
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
                    const newHeight = item.type === 'image' && aspectRatio ? newWidth * aspectRatio : item.height;
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

    const handleExport = async () => {
        if (!exportWrapperRef.current) return;
        setIsExporting(true);
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(exportWrapperRef.current!, {
                    scale: 3,
                    backgroundColor: null,
                    ignoreElements: (element) => element.id === 'dock-controls' || element.id === 'sidebar-toggle',
                    useCORS: true,
                    logging: false,
                });
                const link = document.createElement("a");
                link.href = canvas.toDataURL("image/png");
                link.download = `moodboard-${layoutMode}.png`;
                link.click();
            } catch (e) {
                console.error("Export failed", e);
            } finally {
                setIsExporting(false);
            }
        }, 500);
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

    return (
        <div className="flex items-center justify-center w-full h-screen bg-[#E5E5EA] overflow-hidden font-sans text-[#1D1D1F]"
            style={{ fontFamily: FONTS[currentFontIndex].family }}>

            <Styles />

            <div ref={exportWrapperRef} className="p-0 md:p-12 w-full h-full flex items-center justify-center">

                <div
                    className="relative w-full h-full max-w-[1800px] md:aspect-[16/10] shadow-2xl overflow-hidden flex flex-row transition-all duration-500"
                    style={{
                        background: bgMode === 'solid' ? background : '#FFFFFF',
                        borderRadius: windowWidth < 768 ? '0px' : `${dashboardRadius}px`
                    }}
                >
                    <AnimatePresence mode='popLayout'>
                        {bgMode === 'gradient' && !isExporting && (
                            <motion.div key="mesh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0">
                                <MeshGradient palette={palette} />
                            </motion.div>
                        )}
                        {bgMode === 'gradient' && isExporting && (
                            <div className="absolute inset-0 z-0 opacity-30" style={{ background: `radial-gradient(circle at 20% 20%, ${palette[0]} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${palette[1]} 0%, transparent 50%), radial-gradient(circle at 50% 50%, ${palette[2]} 0%, transparent 50%)` }} />
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
                                        <div className="text-3xl font-semibold tracking-tight text-gray-900 w-full mb-2 leading-tight">{title || "Visual Exploration 01"}</div>
                                    ) : (
                                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visual Exploration 01" className="text-3xl font-semibold tracking-tight text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-400/50 w-full mb-2 leading-tight" />
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
                                        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-60">Description</h3>
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
                                        <div className="w-full h-full text-lg font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{aboutText || "A curated collection exploring nature and technology."}</div>
                                    ) : isGeneratingDescription ? (
                                        <div className="w-full h-full flex flex-col justify-center space-y-2 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                        </div>
                                    ) : (
                                        <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="A curated collection exploring nature and technology." className="w-full h-full text-lg font-medium text-gray-800 leading-relaxed bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-gray-400/50" />
                                    )}
                                </div>
                                <div className="mb-8">
                                    <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3 opacity-60">Keywords</h3>
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
                                    <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3 opacity-60">Palette</h3>
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
                    <div id="moodboard-canvas" ref={containerRef} className={`flex-1 h-full relative z-10 scroll-smooth custom-scrollbar ${layoutMode === 'grid' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`} style={{ perspective: '1200px' }}>
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
                        {items.length === 0 && !isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                <Plus size={80} strokeWidth={1} className="mb-4 text-black" />
                                <p className="text-xl font-medium text-black">Drag images to start</p>
                            </div>
                        )}

                        {/* --- SHOW MODE VS EDIT MODES --- */}
                        {layoutMode === 'animate' && items.length > 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <AnimatePresence mode="popLayout">
                                    {(() => {
                                        const item = items[activeIndex];
                                        if (!item) return null;
                                        return (
                                            <motion.div
                                                key={item.id}
                                                variants={showVariants}
                                                initial="enter"
                                                animate="center"
                                                exit="exit"
                                                className="absolute w-[400px] max-w-[80%] aspect-[3/4] flex flex-col items-center justify-center"
                                                style={{ transformStyle: 'preserve-3d' }}
                                            >
                                                {/* Content */}
                                                <div className="relative w-full h-full">
                                                    {item.isLoading ? (
                                                        <div className="w-full h-full bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden rounded-xl border border-white/50 shadow-xl">
                                                            <div className="magical-glow opacity-50"></div>
                                                            <Loader className="w-8 h-8 text-purple-600 animate-spin mb-3 relative z-10" />
                                                            <span className="text-xs text-purple-800 font-medium relative z-10">Dreaming...</span>
                                                        </div>
                                                    ) : item.type === 'image' ? (
                                                        <div
                                                            className={`transition-all w-full h-full ${showBorders ? 'bg-white p-[10px]' : ''}`}
                                                            style={{
                                                                borderRadius: `${imageRadius}px`,
                                                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)'
                                                            }}
                                                        >
                                                            <img
                                                                src={item.content}
                                                                className="pointer-events-none select-none object-cover w-full h-full block"
                                                                style={{
                                                                    borderRadius: showBorders ? `${Math.max(0, imageRadius - 8)}px` : `${imageRadius}px`,
                                                                    objectFit: 'cover'
                                                                }}
                                                                crossOrigin="anonymous"
                                                            />
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
                                    })()}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {items.map((item, index) => (
                                    <BoardItem
                                        key={item.id}
                                        item={item}
                                        index={index} // Pass index for staggered animation
                                        layoutMode={layoutMode}
                                        isExporting={isExporting}
                                        magicalItems={magicalItems}
                                        removeItem={removeItem}
                                        handleResizeStart={handleResizeStart}
                                        imageRadius={imageRadius}
                                        showBorders={showBorders}
                                        quoteSize={quoteSize}
                                        updateItemContent={updateItemContent}
                                        bringToFront={bringToFront}
                                        isActive={layoutMode === 'animate' && index === activeIndex}
                                        resizingId={resizingId}
                                        containerRef={containerRef}
                                    />
                                ))}
                            </AnimatePresence>
                        )}

                    </div>
                    {/* --- DOCK --- */}
                    {!isExporting && (
                        <div id="dock-controls" className="absolute bottom-4 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:w-auto z-[9999] flex flex-col items-end gap-4 pointer-events-none">
                            {showSettings && (
                                <div className="flex flex-col gap-4 p-5 rounded-3xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 fade-in w-80">
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dashboard Radius</span><span className="text-white font-mono text-xs">{dashboardRadius}px</span></div>
                                            <input type="range" min="0" max="60" value={dashboardRadius} onChange={(e) => setDashboardRadius(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Item Radius</span><span className="text-white font-mono text-xs">{imageRadius}px</span></div>
                                            <input type="range" min="0" max="60" value={imageRadius} onChange={(e) => setImageRadius(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors" />
                                        </div>
                                        <div className="h-px bg-white/10 w-full" />
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Background</span><div className="flex gap-2"><button onClick={() => setBgMode('solid')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'solid' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}>Solid</button><button onClick={() => setBgMode('gradient')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'gradient' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}>Gradient</button></div></div>
                                            {bgMode === 'gradient' && (
                                                <div className="flex justify-between gap-2 pt-1">
                                                    {[0, 1, 2].map((i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border border-white/20 relative overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform">
                                                            <input type="color" value={palette[i] || '#ffffff'} onChange={(e) => updatePaletteColor(i, e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0" />
                                                            <div className="w-full h-full" style={{ backgroundColor: palette[i] }} />
                                                        </div>
                                                    ))}
                                                    <button onClick={() => updatePaletteFromAllImages([], true)} className="ml-auto text-[10px] text-white/70 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"><RefreshCw size={10} /> Shuffle</button>
                                                </div>
                                            )}
                                            {bgMode === 'solid' && (
                                                <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                                                    {['#FFFFFF', '#F3F4F6', '#000000', '#1a1a1a'].map(c => (<button key={c} onClick={() => setBackground(c)} className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: c }} />))}
                                                    <div className="w-6 h-6 rounded-full border border-white/20 relative overflow-hidden"><input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 opacity-0 cursor-pointer" /><div className="w-full h-full" style={{ backgroundColor: background }} /></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-px bg-white/10 w-full" />
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Elements</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center"><span className="text-xs font-medium text-neutral-300">Text Size</span><span className="text-[10px] font-mono text-neutral-500">{quoteSize}px</span></div>
                                                <input type="range" min="12" max="48" value={quoteSize} onChange={(e) => setQuoteSize(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors" />
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs font-medium text-neutral-300">Image Frames</span>
                                                <button onClick={() => setShowBorders(!showBorders)} className={`w-12 h-6 rounded-full p-1 transition-colors ${showBorders ? 'bg-white' : 'bg-white/10'}`}><div className={`w-4 h-4 rounded-full shadow-sm transition-transform ${showBorders ? 'translate-x-6 bg-black' : 'bg-white'}`} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* UPDATED MENU: Frosted Light Theme */}
                            <div className="flex items-center gap-2 p-2 rounded-3xl bg-white/60 backdrop-blur-2xl shadow-2xl border border-white/50 overflow-x-auto max-w-full pointer-events-auto no-scrollbar">
                                <div className="relative group">
                                    <DockButton onClick={() => fileInputRef.current?.click()} icon={Plus} label="Add" />
                                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
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

                                <DockButton onClick={addQuote} icon={Type} label="Text" />
                                <DockButton onClick={cycleFonts} icon={CaseUpper} label="Font" />
                                <div className="w-px h-8 bg-black/10 mx-1" />
                                <DockButton onClick={() => setShowSettings(!showSettings)} icon={Settings} label="Style" active={showSettings} />
                                {/* ADDED ANIMATE BUTTON BACK */}
                                <div id="tour-layout" className="flex gap-2">
                                    <DockButton onClick={() => toggleLayoutMode('organic')} icon={Wind} label="Dynamic" active={layoutMode === 'organic'} />
                                    <DockButton onClick={() => toggleLayoutMode('grid')} icon={LayoutGrid} label="Grid" active={layoutMode === 'grid'} />
                                </div>
                                <DockButton
                                    onClick={() => {
                                        if (layoutMode === 'animate') {
                                            setIsPaused(!isPaused);
                                        } else {
                                            toggleLayoutMode('animate');
                                            setIsPaused(false);
                                        }
                                    }}
                                    icon={layoutMode === 'animate' && !isPaused ? Pause : Play}
                                    label={layoutMode === 'animate' ? (isPaused ? "Play" : "Pause") : "Show"}
                                    active={layoutMode === 'animate'}
                                />
                                <div className="w-px h-8 bg-black/10 mx-1" />
                                <DockButton onClick={handleExport} icon={Download} label="Save" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <TourGuide onStepChange={handleTourStepChange} />
        </div >
    );
};

export default OrganicMoodboard;