import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Download, X, Plus, Type, Settings, Scaling, CaseUpper, LayoutGrid, Sparkles, RefreshCw, Image as ImageIcon, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';

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
};

// --- DOCK BUTTON COMPONENT ---
const DockButton = ({ onClick, icon: Icon, label, active = false }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative ${active ? 'bg-white text-black shadow-lg scale-105' : 'hover:bg-white/10 text-white hover:scale-105'}`}
  >
    <Icon size={20} strokeWidth={2} />
    <span className="absolute -top-8 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none backdrop-blur-sm">
      {label}
    </span>
  </button>
);

// --- ANIMATED MESH GRADIENT ---
const MeshGradient = ({ palette }: { palette: string[] }) => {
  // Safety: Ensure palette has at least 3 colors
  const safePalette = palette.length >= 3 ? palette : ['#F3F4F6', '#E5E7EB', '#D1D5DB'];

  return (
    <div className="absolute inset-0 overflow-hidden z-0 rounded-[inherit] opacity-15 pointer-events-none">
      <motion.div 
        animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[150px]"
        style={{ backgroundColor: safePalette[0] }}
      />
      <motion.div 
        animate={{ x: [0, -70, 30, 0], y: [0, 60, -40, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[-20%] w-[60%] h-[80%] rounded-full blur-[150px]"
        style={{ backgroundColor: safePalette[1] }}
      />
      <motion.div 
        animate={{ x: [0, 50, -50, 0], y: [0, -30, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-20%] left-[20%] w-[80%] h-[60%] rounded-full blur-[150px]"
        style={{ backgroundColor: safePalette[2] }}
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

const OrganicMoodboard = () => {
  // --- State ---
  const [items, setItems] = useState<BoardItem[]>([]);
  const [globalZIndex, setGlobalZIndex] = useState(10);
  const [layoutMode, setLayoutMode] = useState<'organic' | 'grid'>('organic');
  
  // Style State
  const [dashboardRadius, setDashboardRadius] = useState(32);
  const [imageRadius, setImageRadius] = useState(12); 
  const [background, setBackground] = useState('#FFFFFF');
  const [bgMode, setBgMode] = useState<'solid' | 'gradient'>('gradient');
  
  const [smartGradient, setSmartGradient] = useState(''); 
  const [currentFontIndex, setCurrentFontIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [resizingId, setResizingId] = useState<string | null>(null);
  
  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Content State
  const [title, setTitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [tags, setTags] = useState(['', '', '', '']); 
  // Safe initial palette
  const [palette, setPalette] = useState(['#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#4B5563', '#1F2937']);
  const [author, setAuthor] = useState("");

  const exportWrapperRef = useRef<HTMLDivElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- Helpers ---
  const imageItems = items.filter(i => i.type === 'image');
  
  // --- PALETTE EXTRACTOR ---
  const updatePaletteFromAllImages = (newImageUrls: string[] = []) => {
    const currentUrls = items.filter(i => i.type === 'image').map(i => i.content);
    const allUrls = [...currentUrls, ...newImageUrls];

    if (allUrls.length === 0) return;

    const collectedColors: string[] = [];
    const samplesPerImage = Math.ceil(6 / Math.min(allUrls.length, 6)); 
    let processed = 0;
    const urlsToScan = allUrls.slice(-6); 

    urlsToScan.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            canvas.width = 50; canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);
            
            const samplePoints = [[25,25], [10,10], [40,40], [25,10], [25,40]];
            
            for(let i=0; i<samplesPerImage; i++) {
                if(collectedColors.length >= 6) break;
                const pt = samplePoints[i % samplePoints.length];
                const p = ctx.getImageData(pt[0], pt[1], 1, 1).data;
                if(p[0] > 250 && p[1] > 250 && p[2] > 250) continue; 
                if(p[0] < 10 && p[1] < 10 && p[2] < 10) continue; 
                collectedColors.push(`rgb(${p[0]}, ${p[1]}, ${p[2]})`);
            }
            
            processed++;
            if(processed === urlsToScan.length) {
                while(collectedColors.length < 6) collectedColors.push('#E5E7EB');
                setPalette(collectedColors);
                const gradient = `linear-gradient(135deg, ${collectedColors[0]} 0%, ${collectedColors[1]} 100%)`;
                setSmartGradient(gradient);
                if(bgMode === 'gradient') setBackground(gradient);
            }
        }
    });
  };

  // --- MANUAL COLOR UPDATE ---
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
        heightPercent: undefined 
    };
  };

  const getGridPos = (index: number, totalCount: number) => {
    const cols = 5; 
    const rows = Math.ceil(totalCount / cols);
    const gap = 3; 
    
    const cellWidth = (90 - (gap * (cols - 1))) / cols; 
    const cellHeight = 90 / Math.max(rows, 3); 
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
      heightPercent: cellHeight
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
    const containerWidth = containerRef.current?.clientWidth || 1200;
    const containerHeight = containerRef.current?.clientHeight || 800;

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

  const addQuote = () => {
    const predictedTotal = items.length + 1;
    const gridData = getSmartPos(items.length, predictedTotal, layoutMode);
    const containerWidth = containerRef.current?.clientWidth || 1200;
    const containerHeight = containerRef.current?.clientHeight || 800;
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
      const containerWidth = containerRef.current?.clientWidth || 1200;
      const containerHeight = containerRef.current?.clientHeight || 800;

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

  const toggleLayoutMode = (mode: 'organic' | 'grid') => {
    setLayoutMode(mode);
    setItems(prev => {
        const shuffledItems = [...prev].sort(() => Math.random() - 0.5);
        const total = shuffledItems.length;
        const containerWidth = containerRef.current?.clientWidth || 1200;
        const containerHeight = containerRef.current?.clientHeight || 800;

        return shuffledItems.map((item, index) => {
            if (mode === 'grid') {
                const pos = getGridPos(index, total);
                return { 
                    ...item, 
                    x: pos.x, 
                    y: pos.y, 
                    rotation: 0, 
                    width: (pos.widthPercent / 100) * containerWidth,
                    height: (pos.heightPercent! / 100) * containerHeight
                };
            } else {
                const pos = getOrganicPos(index);
                return { 
                    ...item, 
                    x: pos.x, 
                    y: pos.y, 
                    rotation: pos.rotation,
                    width: item.manualWidth || 220,
                    height: undefined 
                };
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

  const handleResizeStart = (e: React.PointerEvent, id: string, initialWidth: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingId(id);

    const startX = e.clientX;
    const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(100, initialWidth + deltaX);
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newHeight = item.type === 'image' && item.aspectRatio ? newWidth / item.aspectRatio : item.height;
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

  return (
    <div className="flex items-center justify-center w-full h-screen bg-[#E5E5EA] overflow-hidden font-sans text-[#1D1D1F]"
         style={{ fontFamily: FONTS[currentFontIndex].family }}>
      
      {/* --- EXPORT WRAPPER --- */}
      <div ref={exportWrapperRef} className="p-12 w-full h-full flex items-center justify-center"> 

        {/* --- THE MAIN DASHBOARD --- */}
        <div 
            className="relative w-full h-full max-w-[1800px] aspect-[16/10] shadow-2xl overflow-hidden flex flex-row transition-all duration-500"
            style={{ 
                background: bgMode === 'solid' ? background : '#FFFFFF',
                borderRadius: `${dashboardRadius}px`
            }}
        >
            {/* --- BACKGROUND LAYERS --- */}
            <AnimatePresence mode='popLayout'>
                {bgMode === 'gradient' && !isExporting && (
                    <motion.div key="mesh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0">
                        <MeshGradient palette={palette} />
                    </motion.div>
                )}
                {bgMode === 'gradient' && isExporting && (
                    <div className="absolute inset-0 z-0 opacity-30" 
                         style={{ 
                            background: `radial-gradient(circle at 20% 20%, ${palette[0]} 0%, transparent 50%),
                                         radial-gradient(circle at 80% 80%, ${palette[1]} 0%, transparent 50%),
                                         radial-gradient(circle at 50% 50%, ${palette[2]} 0%, transparent 50%)` 
                         }} 
                    />
                )}
                {bgMode === 'solid' && background !== '#FFFFFF' && (
                     <motion.div key="solid" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0" style={{ backgroundColor: background }} />
                )}
            </AnimatePresence>

            {/* --- LOADING OVERLAY --- */}
            <AnimatePresence>
                {isLoading && <LoadingCards />}
            </AnimatePresence>

            {/* --- SIDEBAR TOGGLE --- */}
            {!isExporting && (
                <button 
                    id="sidebar-toggle"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-6 left-6 z-50 p-2 bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-xl transition-all shadow-sm text-gray-600 hover:scale-105"
                >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            )}

            {/* --- 1. LEFT SIDEBAR --- */}
            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "20%", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className={`h-full flex flex-col p-8 border-r border-black/5 relative z-20 ${isExporting ? 'bg-white/90' : 'bg-white/40 backdrop-blur-md'}`}
                    >
                        <div className="mb-8 mt-10">
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
                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3 opacity-60">Description</h3>
                            {isExporting ? (
                                <div className="w-full h-full text-lg font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{aboutText || "A curated collection of textures, forms, and colors exploring the intersection of nature and technology."}</div>
                            ) : (
                                <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="A curated collection of textures, forms, and colors exploring the intersection of nature and technology." className="w-full h-full text-lg font-medium text-gray-800 leading-relaxed bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-gray-400/50" />
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

            {/* --- 2. RIGHT CANVAS --- */}
            <div ref={containerRef} className="flex-1 h-full relative overflow-hidden z-10">
                {items.length === 0 && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                        <Plus size={80} strokeWidth={1} className="mb-4 text-black"/>
                        <p className="text-xl font-medium text-black">Drag images to start</p>
                    </div>
                )}

                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            layout={resizingId !== item.id} 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                x: 0, 
                                y: 0, 
                                rotate: item.rotation, 
                                zIndex: item.zIndex,
                                width: item.width,
                                height: item.height || 'auto'
                            }}
                            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1 }}
                            
                            drag={!isExporting} 
                            dragConstraints={containerRef}
                            dragElastic={0.1} 
                            dragMomentum={false}
                            onDragStart={() => bringToFront(item.id)}
                            onPointerDown={() => bringToFront(item.id)}
                            
                            whileHover={!isExporting ? { scale: 1.02, cursor: 'grab', zIndex: 999 } : {}}
                            whileDrag={{ 
                                scale: 1.15, 
                                rotate: 5, 
                                boxShadow: "0 40px 80px -20px rgba(0, 0, 0, 0.5)",
                                cursor: 'grabbing',
                                zIndex: 9999 
                            }}
                            
                            className="absolute group"
                            style={{ 
                                left: `${item.x}%`, 
                                top: `${item.y}%`, 
                                width: `${item.width}px`,
                                height: item.height ? `${item.height}px` : 'auto'
                            }}
                        >
                            <div className="relative w-full h-full">
                                {!isExporting && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-sm hover:scale-110"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                )}

                                {item.type === 'image' ? (
                                    <div 
                                        className="bg-white p-[8px] transition-all w-full h-full"
                                        style={{ 
                                            borderRadius: `${imageRadius}px`,
                                            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.25)' 
                                        }}
                                    >
                                        <img 
                                            src={item.content} 
                                            className="pointer-events-none select-none object-cover w-full h-full block"
                                            style={{ 
                                                borderRadius: `${Math.max(0, imageRadius - 6)}px`,
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
                                                <div className="text-xl font-medium text-gray-800 leading-snug">{item.content}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div contentEditable suppressContentEditableWarning className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3 outline-none">{item.author}</div>
                                                <div contentEditable suppressContentEditableWarning className="text-xl font-medium text-gray-800 leading-snug outline-none">{item.content}</div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* --- DOCK --- */}
                {!isExporting && (
                    <div id="dock-controls" className="absolute bottom-8 right-8 z-[9999] flex flex-col items-end gap-4">
                        
                        {/* New High Contrast Style Menu */}
                        <AnimatePresence>
                            {showSettings && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                    className="absolute bottom-20 right-0 w-72 p-6 rounded-3xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl"
                                >
                                    <div className="space-y-5">
                                        {/* Sliders */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dashboard Radius</span>
                                                <span className="text-white font-mono text-xs">{dashboardRadius}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="60" 
                                                value={dashboardRadius} 
                                                onChange={(e) => setDashboardRadius(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Image Radius</span>
                                                <span className="text-white font-mono text-xs">{imageRadius}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="60" 
                                                value={imageRadius} 
                                                onChange={(e) => setImageRadius(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors"
                                            />
                                        </div>

                                        <div className="h-px bg-white/10 w-full" />

                                        {/* Background Toggles */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Background</span>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setBgMode('solid')} 
                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'solid' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                    >
                                                        Solid
                                                    </button>
                                                    <button 
                                                        onClick={() => setBgMode('gradient')} 
                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${bgMode === 'gradient' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                    >
                                                        Gradient
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Manual Gradient Controls */}
                                            {bgMode === 'gradient' && (
                                                <div className="flex justify-between gap-2 pt-1">
                                                     {[0, 1, 2].map((i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border border-white/20 relative overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform">
                                                            <input 
                                                                type="color" 
                                                                value={palette[i] || '#ffffff'} 
                                                                onChange={(e) => updatePaletteColor(i, e.target.value)}
                                                                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                                                            />
                                                            <div className="w-full h-full" style={{ backgroundColor: palette[i] }} />
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => setPalette(prev => [...prev].sort(() => Math.random() - 0.5))} 
                                                        className="ml-auto text-[10px] text-white/70 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                                                    >
                                                        <RefreshCw size={10}/> Shuffle
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Solid Picker */}
                                            {bgMode === 'solid' && (
                                                <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                                                    {['#FFFFFF', '#F3F4F6', '#E5E7EB', '#000000', '#1a1a1a'].map(c => (
                                                        <button key={c} onClick={() => setBackground(c)} className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: c }} />
                                                    ))}
                                                    <div className="w-6 h-6 rounded-full border border-white/20 relative overflow-hidden">
                                                        <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 opacity-0 cursor-pointer" />
                                                        <div className="w-full h-full" style={{ backgroundColor: background }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Dock */}
                        <div className="flex items-center gap-3 p-3 rounded-3xl bg-black/80 backdrop-blur-xl shadow-2xl border border-white/10">
                            <div className="relative group"><DockButton onClick={() => fileInputRef.current?.click()} icon={Plus} label="Add" /><input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload}/></div>
                            <DockButton onClick={addQuote} icon={Type} label="Text" />
                            <DockButton onClick={cycleFonts} icon={CaseUpper} label="Font" />
                            <div className="w-px h-10 bg-white/10 mx-1" />
                            <DockButton onClick={() => setShowSettings(!showSettings)} icon={Settings} label="Style" active={showSettings} />
                            <DockButton onClick={() => toggleLayoutMode('organic')} icon={Sparkles} label="Free" active={layoutMode === 'organic'} />
                            <DockButton onClick={() => toggleLayoutMode('grid')} icon={LayoutGrid} label="Grid" active={layoutMode === 'grid'} />
                            <div className="w-px h-10 bg-white/10 mx-1" />
                            <DockButton onClick={handleExport} icon={Download} label="Save" />
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrganicMoodboard;