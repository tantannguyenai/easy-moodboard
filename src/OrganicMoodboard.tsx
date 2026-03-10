import React, { useState, useRef, useEffect } from 'react';
// FIX: Added 'type' keyword before Variants to satisfy strict TS rules
import { motion, AnimatePresence, usePresence, useMotionValue, useVelocity, useTransform, useSpring, animate } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
    Download, X, Plus, Type, SlidersHorizontal, Scaling,
    ChevronLeft, ChevronRight,
    Copy, Play, Pause, Loader, RotateCw, Music, FileImage,
    Image as ImageIcon, Video, Volume2
} from 'lucide-react';
// Ensure this path matches where you put the file
import { generateMoodImageFromBoard } from './services/imageGenerator';

import FlowerTulipIcon from './assets/flower-tulip.svg';
import FlowerTulipGrayIcon from './assets/flower-tulip-gray.svg';
import ShuffleSimpleIcon from './assets/shuffle-simple.svg';
import ShuffleSimpleBlackIcon from './assets/shuffle-simple-black.svg';
import SlideshowIcon from './assets/slideshow.svg';
import SlideshowBlackIcon from './assets/slideshow-black.svg';
import MoodLogo from './assets/Logo.svg';
import { TourGuide } from './components/TourGuide';
import { PDFFlipBook } from './components/PDFFlipBook'; // Import PDF component
import { ShaderBackground } from './components/ShaderBackground'; // Import ShaderBackground
import { DissolveEffect } from './components/DissolveEffect'; // Import DissolveEffect
import { MeshGradient as PaperMeshGradient } from '@paper-design/shaders-react';

import { pdfjs } from 'react-pdf';

// Configure worker for PDF processing
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Helpers ---
const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(x => {
        const h = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return h.length === 1 ? '0' + h : h;
    }).join('');

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 1 };
    let r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            default: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255));
}

// Minimal color picker: circle trigger + popover with only hue/saturation UI (no RGB)
const MinimalColorPicker = ({ value, onChange }: { value: string; onChange: (hex: string) => void }) => {
    const [open, setOpen] = useState(false);
    const popRef = useRef<HTMLDivElement>(null);
    const { h, s, l } = hexToHsl(value);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const handleHue = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onChange(hslToHex(x * 360, s, l));
    };
    const handleSL = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const newS = x * 100;
        const newL = (1 - y) * 100;
        onChange(hslToHex(h, newS, newL));
    };

    return (
        <div className="relative" ref={popRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-3 h-3 rounded-full border border-[#d5d5d5] cursor-pointer overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1e1e1e] focus:ring-offset-1"
                style={{ backgroundColor: value }}
                aria-label="Pick border color"
            />
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 z-[10000] p-2 rounded-[12px] bg-white border border-[#e1e1e1] shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
                    >
                        <div
                            className="w-32 h-20 rounded-[8px] cursor-crosshair mb-2 border border-[#e6e6e6]"
                            style={{
                                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hslToHex(h, 100, 50)})`
                            }}
                            onMouseDown={(e) => { e.preventDefault(); handleSL(e); }}
                            onMouseMove={(e) => { if (e.buttons === 1) handleSL(e); }}
                        />
                        <div
                            className="w-32 h-2 rounded-full cursor-pointer border border-[#e6e6e6]"
                            style={{
                                background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
                            }}
                            onMouseDown={(e) => { e.preventDefault(); handleHue(e); }}
                            onMouseMove={(e) => { if (e.buttons === 1) handleHue(e); }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Constants ---
const QUOTES = [
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Design is intelligence made visible.", author: "Alina Wheeler" },
    { text: "Less is more.", author: "Mies van der Rohe" },
    { text: "Creativity takes courage.", author: "Henri Matisse" },
    { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
];



const FONTS = [
    { name: "Geist", family: "'Geist Variable', ui-sans-serif, system-ui, sans-serif" },
    { name: "Geist Mono", family: "'Geist Mono Variable', ui-monospace, monospace" },
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

const LOADING_WORDS = ['Generating', 'Curating', 'Crafting'];

// Generating card — matches Paper design (node 33-0): mesh gradient background, layered gradient orb, breathing + gradient border + loading text
const GeneratingCard: React.FC<{ borderRadius?: number }> = ({ borderRadius = 20 }) => {
    const [wordIndex, setWordIndex] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setWordIndex((i) => (i + 1) % LOADING_WORDS.length), 3200);
        return () => clearInterval(t);
    }, []);
    return (
        <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ borderRadius }}
        >
            <motion.div
                className="relative flex flex-col items-center justify-center overflow-hidden gen-card-mesh-bg"
                style={{
                    borderRadius,
                    minHeight: 280,
                    height: 280,
                    width: 340,
                    paddingTop: 41,
                    paddingBottom: 40,
                    paddingLeft: 100,
                    paddingRight: 100,
                    gap: 32,
                }}
                animate={{
                    y: [0, -8, 0, -4, 0],
                    rotate: [0, 1.2, 0, -1.2, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                {/* Paper Mesh Gradient shader background — from Paper file node 2B-0 */}
                <div className="absolute rounded-[inherit] bg-white" style={{ top: -20, left: -20, right: -20, bottom: -20, borderRadius, filter: 'blur(20px) contrast(110%)' }}>
                    <PaperMeshGradient
                        width={380}
                        height={320}
                        fit="cover"
                        colors={['#C5DBFF', '#FBFDF3', '#FFBD7B', '#FFFFFF', '#FF70D9', '#F1F4FF', '#FF70D9']}
                        distortion={0.12}
                        swirl={1}
                        grainMixer={0.31}
                        grainOverlay={0.12}
                        speed={1.5}
                        scale={1.44}
                    />
                </div>
                {/* Animated gradient border (branding-style conic spin) */}
                <div
                    className="gen-card-border"
                    style={{ borderRadius }}
                />
                {/* Gradient frame — each layer animated with scale only (no position drift) to preserve original layout ratio */}
                <div className="relative flex-shrink-0 z-10" style={{ width: 140, height: 117 }}>
                    {/* Layer 1: 140×117 — blur 10px — centered (50%, 50%) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            className="rounded-[38px]"
                            style={{
                                width: 140,
                                height: 117,
                                filter: 'blur(10px)',
                                backgroundImage: 'linear-gradient(in oklab 180deg, oklab(95.6% -0.007 -0.020) 0%, oklab(93% 0.009 -0.034) 50.42%, oklab(81.6% 0.065 0.108) 100.57%)',
                            }}
                            animate={{ scale: [1, 1.12, 1] }}
                            transition={{ scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }}
                        />
                    </div>
                    {/* Layer 2: 124×102 — blur 5px — center at (50%, 50% - 2.5px) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ marginTop: -2.5 }}>
                        <motion.div
                            className="rounded-[38px]"
                            style={{
                                width: 124,
                                height: 102,
                                filter: 'blur(5px)',
                                backgroundImage: 'linear-gradient(in oklab 180deg, oklab(100% .0001 0 / 0%) 0%, oklab(78.4% 0.157 -0.048) 50.42%, oklab(100% .0001 0) 93.99%)',
                            }}
                            animate={{ scale: [0.98, 1.06, 0.98] }}
                            transition={{ scale: { duration: 2.9, repeat: Infinity, ease: 'easeInOut' } }}
                        />
                    </div>
                    {/* Layer 3: 101×76 — blur 5px — center at (50% - 0.5px, 50% - 9.5px) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ marginLeft: -0.5, marginTop: -9.5 }}>
                        <motion.div
                            className="rounded-[38px]"
                            style={{
                                width: 101,
                                height: 76,
                                filter: 'blur(5px)',
                                backgroundImage: 'linear-gradient(in oklab 180deg, oklab(88.8% -0.004 -0.054 / 0%) 0%, oklab(100% 0 -.0001) 50.42%, oklab(100% 0 0) 100.85%)',
                            }}
                            animate={{ scale: [1.04, 0.97, 1.04] }}
                            transition={{ scale: { duration: 2.1, repeat: Infinity, ease: 'easeInOut' } }}
                        />
                    </div>
                </div>
                {/* Text — gradient + shimmer, cycles through Generating / Curating / Crafting */}
                <div className="flex-shrink-0 text-[16px] leading-[22px] font-sans min-w-[120px] text-center relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={LOADING_WORDS[wordIndex]}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                            className="gen-card-loading-text inline-block"
                        >
                            {LOADING_WORDS[wordIndex]}...
                        </motion.span>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

// --- STYLES FOR EFFECTS ---
const Styles = () => (
    <style>{`
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
    @keyframes gen-border-spin {
        0%   { --angle: 0deg; }
        100% { --angle: 360deg; }
    }
    @keyframes gen-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
    }
    /* Animated conic gradient border for generating card */
    @property --angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
    }
    .gen-card-border {
        position: absolute;
        inset: 0;
        padding: 2.5px;
        background: conic-gradient(from var(--angle), #ffb3d4, #ffd6b8, #f9c9f5, #b8d4f8, #ffb3d4);
        animation: gen-border-spin 3s linear infinite;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        z-index: 1;
    }
    /* Shimmer gradient text for "Generating..." */
    .gen-shimmer-text {
        background: linear-gradient(
            90deg,
            #ff9f63 0%,
            #daa9f2 35%,
            #87b3f1 65%,
            #ff9f63 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: gen-shimmer 2.2s linear infinite;
    }
    /* Generating card uses Paper MeshGradient as background (orb + border + text in flow above) */
    /* Generating card label: richer gradient + shadow for contrast on mesh background */
    .gen-card-loading-text {
        background: linear-gradient(
            90deg,
            #5b8dd6 0%,
            #9b6bb8 25%,
            #c46b7a 50%,
            #a55ba8 75%,
            #5b8dd6 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        text-shadow: 0 0 24px rgba(90, 100, 140, 0.3);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.08));
        animation: gen-shimmer 2.8s linear infinite;
    }
    /* AI gradient visual — two states from Figma 106-889: State1 blue→pink→orange, State2 orange→pink→yellow; radial “luminous core” vector */
    @keyframes ai-gradient-state1 {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }
    @keyframes ai-gradient-state2 {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
    }
    .ai-gradient-loop-state1 {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background:
            linear-gradient(180deg, #DDE2F7 0%, #F7DDE5 40%, #F7E2DD 75%, #F0D4C8 100%);
        filter: blur(10px);
        animation: ai-gradient-state1 2.5s ease-in-out infinite;
        pointer-events: none;
    }
    .ai-gradient-loop-state2 {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background:
            linear-gradient(180deg, #F7E2DD 0%, #F7DDE5 40%, #F7F7DD 75%, #F5F0C8 100%);
        filter: blur(10px);
        animation: ai-gradient-state2 2.5s ease-in-out infinite;
        pointer-events: none;
    }
     /* Custom Mood Slider */
    .mood-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        border-radius: 20px;
        background: #e6e6e6;
        cursor: pointer;
        outline: none;
        transition: all 0.35s ease;
    }
    .mood-slider:hover {
        height: 8px;
        background: linear-gradient(to right, #fff3e9, #ffeffe 49%, #dfe8ff);
    }
    /* Webkit thumb (Chrome, Safari) */
    .mood-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #1e1e1e;
        border: none;
        cursor: pointer;
        transition: all 0.35s ease;
        box-shadow: none;
    }
    .mood-slider:hover::-webkit-slider-thumb {
        width: 13px;
        height: 13px;
        background: radial-gradient(ellipse at 50% 100%, #ff7f2a 6%, #ff8544 11%, #ff8a5d 16%, #ff9691 27%, #fea1c5 38%, #feadf9 48%, #cba3fa 61%, #999afc 74%, #6691fd 87%, #338fff 100%);
        border: 0.7px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.1);
    }
    /* Firefox thumb */
    .mood-slider::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #1e1e1e;
        border: none;
        cursor: pointer;
        transition: all 0.35s ease;
        box-shadow: none;
    }
    .mood-slider:hover::-moz-range-thumb {
        width: 13px;
        height: 13px;
        background: radial-gradient(ellipse at 50% 100%, #ff7f2a 6%, #ff8544 11%, #ff8a5d 16%, #ff9691 27%, #fea1c5 38%, #feadf9 48%, #cba3fa 61%, #999afc 74%, #6691fd 87%, #338fff 100%);
        border: 0.7px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.1);
    }
    /* Webkit track */
    .mood-slider::-webkit-slider-runnable-track {
        height: inherit;
        border-radius: 20px;
        transition: all 0.35s ease;
    }
    /* Firefox track */
    .mood-slider::-moz-range-track {
        height: inherit;
        border-radius: 20px;
        background: inherit;
        transition: all 0.35s ease;
    }
  `}</style>
);

// --- BOTTOM DOCK (Figma 79:300): icon-only by default, expand to icon+label on hover ---
// Now uses SVG image icons (Phosphor) instead of Lucide, with gray (#525252) when not hovered
const BottomDockButton = React.memo(({ onClick, iconSrc, iconSrcHover, icon: Icon, label, active = false, className = "", id, roundedClass = "rounded-[12px]" }: any) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            title={label}
            id={id}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`flex items-center gap-[4px] overflow-hidden border border-[#e1e1e1] transition-all duration-200 flex-shrink-0 ${roundedClass}
                ${hovered || active ? 'bg-[#e7e7e7]' : 'bg-white'}
                ${className}`}
            style={{ padding: '6px 16px' }}
        >
            {iconSrc ? (
                <img src={hovered && iconSrcHover ? iconSrcHover : iconSrc} alt={label} className="flex-shrink-0 w-4 h-4 transition-opacity duration-200" />
            ) : Icon ? (
                <Icon size={16} className="flex-shrink-0 transition-colors duration-200" strokeWidth={1.5} style={{ color: hovered ? '#000000' : '#525252' }} />
            ) : null}
            <motion.span
                className="font-medium text-[14px] leading-[21px] text-black whitespace-nowrap overflow-hidden"
                initial={false}
                animate={{ width: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                {label}
            </motion.span>
        </button>
    );
});

// Add button with sub-menu popover (Image, Video, Text)
const AddDockButton = ({ onAddImage, onAddVideo, onAddText }: { onAddImage: () => void; onAddVideo: () => void; onAddText: () => void }) => {
    const [hovered, setHovered] = useState(false);
    const timeoutRef = useRef<any>(null);

    const handleEnter = () => { clearTimeout(timeoutRef.current); setHovered(true); };
    const handleLeave = () => { timeoutRef.current = setTimeout(() => setHovered(false), 150); };

    return (
        <div className="relative flex-shrink-0" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button
                title="Add"
                className={`flex items-center gap-[4px] overflow-hidden rounded-[12px] border border-[#e1e1e1] transition-all duration-200
                    ${hovered ? 'bg-[#e7e7e7]' : 'bg-white'}`}
                style={{ padding: '6px 16px' }}
            >
                <Plus size={13} className="flex-shrink-0 transition-colors duration-200" strokeWidth={2} style={{ color: hovered ? '#000000' : '#525252' }} />
                <motion.span
                    className="font-medium text-[14px] leading-[21px] text-black whitespace-nowrap overflow-hidden"
                    initial={false}
                    animate={{ width: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    Add
                </motion.span>
            </button>
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-2 left-0 flex flex-col gap-1 p-[6px] rounded-[12px] bg-white border border-[#e1e1e1] shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-[10000]"
                    >
                        <button onClick={() => { onAddImage(); setHovered(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] hover:bg-[#f2f2f2] transition-colors text-[14px] font-medium text-black whitespace-nowrap">
                            <ImageIcon size={14} strokeWidth={1.5} /> Image
                        </button>
                        <button onClick={() => { onAddVideo(); setHovered(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] hover:bg-[#f2f2f2] transition-colors text-[14px] font-medium text-black whitespace-nowrap">
                            <Video size={14} strokeWidth={1.5} /> Video
                        </button>
                        <button onClick={() => { onAddText(); setHovered(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] hover:bg-[#f2f2f2] transition-colors text-[14px] font-medium text-black whitespace-nowrap">
                            <Type size={14} strokeWidth={1.5} /> Text
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Generate button — Paper mesh gradient shader (node 61-0) with blur + animated gradient border
const GenerateDockButton = ({ onClick, isGenerating, id }: { onClick: () => void; isGenerating: boolean; id?: string }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            title={isGenerating ? "Generating..." : "Generate"}
            id={id}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`relative flex items-center gap-[4px] overflow-hidden rounded-[12px] border-none transition-all duration-200 flex-shrink-0`}
            style={{ padding: '6px 16px', background: 'transparent' }}
        >
            {/* Paper Mesh Gradient shader background — from Paper node 61-0, with blur(4px) */}
            <div
                className="absolute pointer-events-none z-0 overflow-hidden rounded-[12px]"
                style={{
                    top: -12, left: -12, right: -12, bottom: -12,
                    width: 'calc(100% + 24px)', height: 'calc(100% + 24px)',
                    filter: 'blur(4px)',
                }}
            >
                <PaperMeshGradient
                    width={180}
                    height={64}
                    fit="cover"
                    colors={['#A0C4FF', '#FFE6EB', '#FFBB79', '#FFA5E3']}
                    distortion={0.56}
                    swirl={0.09}
                    grainMixer={0}
                    grainOverlay={0}
                    speed={1}
                    scale={2.27}
                />
            </div>
            {/* Animated gradient border stroke */}
            <div className="generate-border-animated" />
            <div className="relative z-10 flex items-center gap-[4px]">
                {isGenerating
                    ? <Loader size={16} className="flex-shrink-0 animate-spin" strokeWidth={1.5} />
                    : <img src={hovered ? FlowerTulipIcon : FlowerTulipGrayIcon} alt="Generate" className="flex-shrink-0 w-4 h-4" />
                }
                <motion.span
                    className="font-medium text-[14px] leading-[21px] text-white whitespace-nowrap overflow-hidden"
                    style={{ mixBlendMode: 'normal' }}
                    initial={false}
                    animate={{ width: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    {isGenerating ? "Generating..." : "Generate"}
                </motion.span>
            </div>
        </button>
    );
};

// --- ANIMATED MESH GRADIENT ---
const MeshGradient = ({ palette, speed = 1, opacity: opacityProp }: { palette: string[], speed?: number; opacity?: number }) => {
    const safePalette = palette.length >= 3 ? palette : ['#F3F4F6', '#E5E7EB', '#D1D5DB'];
    const opacity = opacityProp ?? 0.6;
    const duration = 10 / speed;
    return (
        <div className="absolute inset-0 overflow-hidden z-0 rounded-[inherit] saturate-110 pointer-events-none" style={{ opacity }}>
            <motion.div
                animate={{
                    x: [0, 80, -60, 40, 0],
                    y: [0, -40, 60, -20, 0],
                    scale: [1, 1.25, 0.95, 1.15, 1],
                    backgroundColor: safePalette[0]
                }}
                transition={{
                    x: { duration, repeat: Infinity, ease: "easeInOut" },
                    y: { duration, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[100px]"
            />
            <motion.div
                animate={{
                    x: [0, -60, 50, -30, 0],
                    y: [0, 50, -30, 40, 0],
                    scale: [1, 1.2, 1.35, 1.1, 1],
                    backgroundColor: safePalette[1]
                }}
                transition={{
                    x: { duration: duration * 1.2, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: duration * 1.2, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: duration * 1.2, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute top-[20%] right-[-20%] w-[60%] h-[80%] rounded-full blur-[100px]"
            />
            <motion.div
                animate={{
                    x: [0, 40, -50, 30, 0],
                    y: [0, -25, 40, -35, 0],
                    scale: [1, 1.15, 0.9, 1.2, 1],
                    backgroundColor: safePalette[2]
                }}
                transition={{
                    x: { duration: duration * 0.9, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: duration * 0.9, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: duration * 0.9, repeat: Infinity, ease: "easeInOut" },
                    backgroundColor: { duration: 2, ease: "easeInOut" }
                }}
                className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[100px]"
            />
            {safePalette[3] != null && (
                <motion.div
                    animate={{
                        x: [0, -40, 50, -20, 0],
                        y: [0, 35, -25, 30, 0],
                        scale: [1, 1.2, 1.1, 1.25, 1],
                        backgroundColor: safePalette[3]
                    }}
                    transition={{
                        x: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut" },
                        scale: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut" },
                        backgroundColor: { duration: 2, ease: "easeInOut" }
                    }}
                    className="absolute top-[30%] right-[10%] w-[50%] h-[50%] rounded-full blur-[100px]"
                />
            )}
        </div>
    );
};

// --- LOADING SKELETON ---
const LoadingCards = () => (
    <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center rounded-[inherit]">
        <div className="relative w-24 h-32 mb-8">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 bg-white border border-[#ddd] rounded-[8px]"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
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
            className="text-[14px] font-normal text-[#333]"
        >
            Adding images...
        </motion.p>
    </div>
);

// --- PARTICLE EXPLOSION COMPONENT ---


// --- AUDIO PLAYER COMPONENT ---
const AudioPlayer = ({ src, fileName, style, className, imageRadius }: any) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [volume, setVolume] = useState(1);
    const [audioReactiveLevel, setAudioReactiveLevel] = useState(0); // 0–1, drives shader reaction
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 400, h: 100 });
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const observer = new ResizeObserver(() => {
            setSize({ w: el.clientWidth || 400, h: el.clientHeight || 100 });
        });
        observer.observe(el);
        setSize({ w: el.clientWidth || 400, h: el.clientHeight || 100 });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume * 0.5;
    }, [volume]);

    // Audio analysis: when playing, drive shader from volume/rhythm
    useEffect(() => {
        if (!isPlaying || !audioRef.current) {
            setAudioReactiveLevel(0);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }
        const el = audioRef.current;
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const source = ctx.createMediaElementSource(el);
        source.connect(ctx.destination);
        const analyser = ctx.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        audioContextRef.current = ctx;
        sourceRef.current = source;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let smoothed = 0;

        const tick = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = sum / dataArray.length / 255;
            const bass = (dataArray[0] + dataArray[1] + dataArray[2]) / 3 / 255;
            const level = Math.min(1, avg * 1.2 + bass * 0.3);
            smoothed = smoothed * 0.85 + level * 0.15;
            setAudioReactiveLevel(smoothed);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafRef.current);
            try { ctx.close(); } catch { /* ignore */ }
            audioContextRef.current = null;
            sourceRef.current = null;
            analyserRef.current = null;
        };
    }, [isPlaying]);

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
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center gap-3 p-4 border-[3px] border-white/20 shadow-lg overflow-hidden relative ${className}`}
            style={{
                ...style,
                borderRadius: `${imageRadius}px`,
                backdropFilter: "blur(20px)"
            }}
        >
            {/* When playing: same mesh gradient shader as generating card (Paper 2B-0) */}
            {isPlaying && (
                <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]" style={{ borderRadius: imageRadius }}>
                    <div className="absolute rounded-[inherit] bg-white" style={{ top: -20, left: -20, right: -20, bottom: -20, borderRadius: imageRadius, filter: 'blur(20px) contrast(110%)' }}>
                        <PaperMeshGradient
                            width={size.w + 80}
                            height={size.h + 80}
                            fit="cover"
                            colors={['#C5DBFF', '#FBFDF3', '#FFBD7B', '#FFFFFF', '#FF70D9', '#F1F4FF', '#FF70D9']}
                            distortion={0.12 + audioReactiveLevel * 0.08}
                            swirl={1}
                            grainMixer={0.31}
                            grainOverlay={0.12}
                            speed={1.5 + audioReactiveLevel * 0.8}
                            scale={1.44 + audioReactiveLevel * 0.18}
                        />
                    </div>
                </div>
            )}
            {/* When paused: plain background */}
            {!isPlaying && (
                <div
                    className="absolute inset-0 z-0 transition-all duration-500"
                    style={{
                        background: "rgba(255, 255, 255, 0.8)",
                    }}
                />
            )}

            <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} />

            <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-gray-900 border border-white/20 hover:scale-105 transition-all shadow-sm flex-shrink-0 cursor-pointer z-20 backdrop-blur-sm"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>

            {/* Volume control: visible when playing and hovered */}
            {isPlaying && isHovered && (
                <div className="flex items-center gap-2 flex-shrink-0 z-20 min-w-0 flex-1 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <Volume2 size={14} className="text-gray-600 flex-shrink-0" />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="mood-slider flex-1 min-w-[120px] w-full h-1.5 cursor-pointer"
                    />
                </div>
            )}

            {/* Label + file name: hidden when hovered */}
            {!isHovered && (
                <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isPlaying ? 'text-gray-600' : 'text-gray-400'}`}>Audio</div>
                    <div className="text-sm font-medium text-gray-800 truncate w-full" title={fileName}>{fileName || "Unknown Track"}</div>
                </div>
            )}

            {/* Music icon: hidden when hovered */}
            {!isHovered && (
                <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 relative z-10 transition-colors ${isPlaying ? 'bg-white/50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Music size={16} className={isPlaying ? "icon-dance" : ""} />
                </div>
            )}
        </div>
    );
};

// --- BOARD ITEM COMPONENT ---
// --- FLIPPABLE IMAGE COMPONENT ---
const FlippableImage = ({ item, style, className, showBorders, imageRadius, borderThickness = 10, borderStyle = 'glass', borderColor = '#ffffff', children, isShaderActive, updateAspectRatio }: any) => {

    const handleMediaLoad = (e: any) => {
        if (!updateAspectRatio) return;

        let naturalWidth, naturalHeight;
        if (item.type === 'video') {
            naturalWidth = e.currentTarget.videoWidth;
            naturalHeight = e.currentTarget.videoHeight;
        } else {
            naturalWidth = e.currentTarget.naturalWidth;
            naturalHeight = e.currentTarget.naturalHeight;
        }

        if (naturalWidth && naturalHeight) {
            const newAspectRatio = naturalHeight / naturalWidth;
            // Only update if significantly different to prevent loops/minor jitter
            if (!item.aspectRatio || Math.abs(item.aspectRatio - newAspectRatio) > 0.01) {
                updateAspectRatio(item.id, newAspectRatio);
            }
        }
    };

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (item.type !== 'video' || !videoRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(e => console.log("Autoplay prevented", e));
                    } else {
                        videoRef.current?.pause();
                    }
                });
            },
            { threshold: 0.2 } // Play when 20% visible
        );

        observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [item.type, item.content]);

    // Helper to render the media content with common styling
    const isGlass = borderStyle === 'glass';
    const strokeColor = isGlass ? 'rgba(255,255,255,0.2)' : borderColor;
    const outlineColor = isGlass ? 'rgba(209, 213, 219, 0.6)' : borderColor;
    const renderMediaContent = () => (
        <div className={`w-full h-full overflow-hidden ${showBorders && !isShaderActive ? (isGlass ? 'bg-white/40 backdrop-blur-md' : '') : ''}`}
            style={{
                padding: '0px',
                borderRadius: `${imageRadius}px`,
                boxShadow: showBorders
                    ? (isShaderActive
                        ? '0 30px 60px -12px rgba(0,0,0,0.6)' // Deeper shadow for shader mode
                        : `0 0 0 ${borderThickness}px ${strokeColor}, 0 25px 50px -12px rgba(0,0,0,0.5)`
                    )
                    : '0 25px 50px -12px rgba(0,0,0,0.5)',
                outline: (showBorders && !isShaderActive) ? `1px solid ${outlineColor}` : 'none',
                outlineOffset: (showBorders && !isShaderActive) ? `${borderThickness}px` : '0px'
            }}>
            {item.type === 'video' ? (
                <video
                    ref={videoRef}
                    src={item.content}
                    className="pointer-events-none select-none object-cover w-full h-full block"
                    style={{
                        borderRadius: `${imageRadius}px`,
                        objectFit: 'cover' // Revert to cover as container will resize to fit
                    }}
                    // Remove autoPlay, handle via IntersectionObserver
                    loop
                    muted
                    playsInline
                    preload="metadata" // Optimize loading
                    onLoadedMetadata={handleMediaLoad}
                />
            ) : (
                <img
                    src={item.content}
                    className="pointer-events-none select-none object-cover w-full h-full block"
                    style={{
                        borderRadius: `${imageRadius}px`,
                        objectFit: 'cover' // Revert to cover as container will resize to fit
                    }}
                    crossOrigin="anonymous"
                    loading="lazy" // Optimize loading
                    decoding="async"
                    onLoad={handleMediaLoad}
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

// --- INTERACTIVE QUOTE COMPONENT (Used in empty state) ---
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
    borderStyle,
    borderColor,
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
    updateAspectRatio, // Added prop
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
                        <GeneratingCard borderRadius={imageRadius} />
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
                            borderStyle={borderStyle}
                            borderColor={borderColor}
                            boardTitle={boardTitle}
                            boardAuthor={boardAuthor}
                            updateAspectRatio={updateAspectRatio}
                            onAspectRatioChange={(newRatio: number) => {
                                if (updateAspectRatio && (!item.aspectRatio || Math.abs(item.aspectRatio - newRatio) > 0.01)) {
                                    updateAspectRatio(item.id, newRatio);
                                }
                            }}
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
                            borderStyle={borderStyle}
                            borderColor={borderColor}
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



const DEFAULT_ITEMS: BoardItem[] = [
    {
        id: 'example-1',
        type: 'image',
        content: new URL('./examplesassets/7b8e8ebf-c53a-4824-b4ec-ef55745029a1.jpeg', import.meta.url).href,
        x: 15, y: 15, rotation: -5, zIndex: 1, width: 300, aspectRatio: 1.5, manualWidth: 300,
        author: 'Example'
    },
    {
        id: 'example-2',
        type: 'video',
        content: new URL('./examplesassets/Matcha3.mp4', import.meta.url).href,
        x: 55, y: 20, rotation: 3, zIndex: 2, width: 400, aspectRatio: 0.56, manualWidth: 400,
        author: 'Example'
    },
    {
        id: 'example-3',
        type: 'image',
        content: new URL('./examplesassets/u1357314557_a_abstract_zoom_in_of_people_sitting_at_a_city_park_efdaf28e-ee7d-4fd6-8ec5-05f04d4107bb.png', import.meta.url).href,
        x: 25, y: 55, rotation: 8, zIndex: 3, width: 350, aspectRatio: 1, manualWidth: 350,
        author: 'Example'
    },
    {
        id: 'example-4',
        type: 'image',
        content: new URL('./examplesassets/1763407626973.jpeg', import.meta.url).href,
        x: 70, y: 45, rotation: -2, zIndex: 4, width: 300, aspectRatio: 1.3, manualWidth: 300,
        author: 'Example'
    },
    {
        id: 'example-5',
        type: 'image',
        content: new URL('./examplesassets/feb2e180-d395-40f7-9b85-07d4d470e942.jpeg', import.meta.url).href,
        x: 5, y: 65, rotation: 5, zIndex: 5, width: 250, aspectRatio: 0.77, manualWidth: 250,
        author: 'Example'
    },
    {
        id: 'example-6',
        type: 'video',
        content: new URL('./examplesassets/454fd3e7.mp4', import.meta.url).href,
        x: 45, y: 75, rotation: -3, zIndex: 6, width: 350, aspectRatio: 0.56, manualWidth: 350,
        author: 'Example'
    },
    {
        id: 'example-7',
        type: 'video',
        content: new URL('./examplesassets/coolgradient.mp4', import.meta.url).href,
        x: 80, y: 15, rotation: 6, zIndex: 7, width: 320, aspectRatio: 1, manualWidth: 320,
        author: 'Example'
    },
    {
        id: 'example-8',
        type: 'audio',
        content: new URL('./examplesassets/Aura.mp3', import.meta.url).href,
        x: 10, y: 90, rotation: 0, zIndex: 8, width: 300, aspectRatio: undefined, manualWidth: 300,
        author: 'Aura.mp3'
    }
];

const OrganicMoodboard = () => {
    // --- State ---
    const [items, setItems] = useState<BoardItem[]>([...DEFAULT_ITEMS]);

    // DEBUG: Check items on mount
    useEffect(() => {
        console.log("Checking loaded items:", items.length, items);
    }, []);
    const [globalZIndex, setGlobalZIndex] = useState(10);
    // Default to 'grid' on mobile devices for better initial experience
    const [layoutMode, setLayoutMode] = useState<'organic' | 'grid' | 'animate'>(
        typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'organic'
    );
    const [activeIndex, setActiveIndex] = useState(0);
    const [flippedItems, setFlippedItems] = useState<Set<string>>(new Set()); // Track flipped items
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

    // Style State
    const [dashboardRadius, setDashboardRadius] = useState(32);
    const [imageRadius, setImageRadius] = useState(12);
    const [background, setBackground] = useState('#FFFFFF');
    const [bgMode, setBgMode] = useState<'solid' | 'gradient' | 'shader'>('shader');

    const [showBorders, setShowBorders] = useState(true);
    const [borderStyle, setBorderStyle] = useState<'glass' | 'filled'>('glass');
    const [borderColor, setBorderColor] = useState('#ffffff');
    const [borderThickness, setBorderThickness] = useState(10); // New state for border thickness
    const [showGrid, setShowGrid] = useState(true); // New state for grid overlay (Default ON)
    const [gridType, setGridType] = useState<'square' | 'dot'>('dot'); // New state for grid type (Default Dot)
    const [quoteSize, setQuoteSize] = useState(20);


    const [currentFontIndex, setCurrentFontIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'dashboard' | 'item'>('dashboard');
    const [isExporting, setIsExporting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // New state for overlay
    const [progress, setProgress] = useState(0); // New state for progress
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [resizingId, setResizingId] = useState<string | null>(null);


    // Magical Effect State
    const [magicalItems, setMagicalItems] = useState<string[]>([]);
    const [isShaderMode, setIsShaderMode] = useState(true); // Default to True for shader mode
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

    // Run palette extraction when the board already has image/video on load (e.g. pre-filled or restored)
    useEffect(() => {
        const hasMedia = items.some(i => i.type === 'image' || i.type === 'video');
        if (!hasMedia) return;
        const t = setTimeout(() => updatePaletteFromAllImages(), 400);
        return () => clearTimeout(t);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount when board has media

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
                    collectedColors.push(rgbToHex(p[0], p[1], p[2]));
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

                video.onerror = () => {
                    console.warn("Could not load video for palette extraction:", candidate.url);
                    finish();
                };

                // Fallback if onseeked never fires (e.g. not seekable)
                const fallback = setTimeout(() => finish(), 3000);
                video.onseeked = () => {
                    clearTimeout(fallback);
                    const canvas = document.createElement('canvas');
                    canvas.width = 50; canvas.height = 50;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, 50, 50);
                        extractColorsFromCanvas(ctx);
                    }
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

    // Capture a representative frame from a video as a data URL for AI reference
    const captureVideoSnapshot = (videoUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
            try {
                const video = document.createElement('video');
                video.src = videoUrl;
                video.muted = true;
                video.playsInline = true;
                video.crossOrigin = 'anonymous';

                const onError = () => {
                    cleanup();
                    resolve(null);
                };

                const cleanup = () => {
                    video.removeEventListener('error', onError);
                    video.removeEventListener('loadeddata', onLoadedData);
                    video.removeEventListener('seeked', onSeeked);
                };

                const onSeeked = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const targetWidth = 512;
                        const aspect = video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16;
                        canvas.width = targetWidth;
                        canvas.height = Math.round(targetWidth * aspect);
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            cleanup();
                            resolve(null);
                            return;
                        }
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        cleanup();
                        resolve(dataUrl);
                    } catch {
                        cleanup();
                        resolve(null);
                    }
                };

                const onLoadedData = () => {
                    // Seek slightly into the video to avoid black frames
                    video.currentTime = Math.min(1.0, (video.duration || 2) / 4);
                };

                video.addEventListener('error', onError);
                video.addEventListener('loadeddata', onLoadedData);
                video.addEventListener('seeked', onSeeked);

                // Fallback timeout
                setTimeout(() => {
                    cleanup();
                    resolve(null);
                }, 5000);
            } catch {
                resolve(null);
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
        const isMobile = windowWidth < 640;
        // Mobile: 1 column for "Feed" style scrolling
        const cols = isMobile ? 1 : windowWidth < 1024 ? 3 : 5;
        // const rows = Math.ceil(totalCount / cols); // Unused

        // Increase gap on mobile for better separation
        const gap = isMobile ? 5 : 3;

        const cellWidth = (90 - (gap * (cols - 1))) / cols;
        // Taller height for grid cells on mobile to allow scrolling (approx 45% screen height)
        const cellHeight = isMobile ? 45 : 22;
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

    const handleSave = async () => {
        setIsExporting(true);
        setIsProcessing(true);
        setProgress(0);

        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const element = document.getElementById('moodboard-canvas');
            if (!element) throw new Error("Canvas not found");

            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const width = element.offsetWidth;
            const scale = Math.min(4, Math.max(2, 2400 / width));

            const canvas = await html2canvas(element, {
                scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: bgMode === 'solid' ? background : '#FFFFFF',
                logging: false,
                ignoreElements: (el) => {
                    const id = el.id || '';
                    if (id === 'dock-controls') return true;
                    if (el.closest && el.closest('[data-export-exclude]')) return true;
                    if (el.getAttribute?.('data-export-exclude') === 'true') return true;
                    if (el.classList?.contains('fixed')) return true;
                    return false;
                }
            });

            const link = document.createElement('a');
            link.download = `moodboard-${(title || 'untitled').replace(/[^a-zA-Z0-9-_.]/g, '-')}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save snapshot.");
        } finally {
            setIsExporting(false);
            setIsProcessing(false);
        }
    };

    const handleAiGenerate = async () => {
        const imageItems = items.filter(item => item.type === 'image');
        const videoItems = items.filter(item => item.type === 'video');

        if (imageItems.length === 0 && videoItems.length === 0) {
            alert("Please add at least one image or video to the board first!");
            return;
        }

        const currentImageUrls = [
            ...imageItems.map(item => item.content),
            ...(
                await Promise.all(
                    videoItems.map(v => captureVideoSnapshot(v.content))
                )
            ).filter((u): u is string => Boolean(u))
        ];

        if (currentImageUrls.length === 0) {
            alert("Could not read any visual content from the board.");
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

    const handleShuffle = () => {
        if (items.length <= 1) return;
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        if (layoutMode === 'grid') {
            reLayoutGrid(shuffled);
        } else {
            setItems(shuffled.map((item, index) => {
                const pos = getOrganicPos(index);
                return { ...item, ...pos, width: item.manualWidth || 220, height: undefined };
            }));
        }
    };

    const reLayoutGrid = (currentItems: BoardItem[]) => {
        // Fallback to window dimensions
        const containerWidth = (containerRef.current?.clientWidth || 0) > 0
            ? containerRef.current!.clientWidth
            : window.innerWidth;
        const containerHeight = (containerRef.current?.clientHeight || 0) > 0
            ? containerRef.current!.clientHeight
            : window.innerHeight;

        // Fail-safe handling for dimensions to prevent NaN crash
        let safeWidth = containerWidth;
        let safeHeight = containerHeight;
        if (!safeWidth || safeWidth <= 0) safeWidth = window.innerWidth || 1000;
        if (!safeHeight || safeHeight <= 0) safeHeight = window.innerHeight || 800;

        const cols = windowWidth < 640 ? 2 : windowWidth < 1024 ? 3 : 5;
        const gap = 3; // % horizontal gap
        const cellWidth = (90 - (gap * (cols - 1))) / cols; // %

        // Calculate gap in pixels based on container width to insure uniform spacing
        const gapPx = (gap / 100) * safeWidth;
        const gapVerticalPercent = (gapPx / safeHeight) * 100;

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
            const widthPx = (cellWidth / 100) * safeWidth;
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
                // This is hard to calculate exactly without DOM.
                // We'll approximate or assume the user has resized it if it was manual.
                // If it's a new item, it might be tricky.
                // Let's use a safe fallback.
                if (!item.height) heightPx = widthPx * 0.6; // Default aspect for text
            }

            const heightPercent = (heightPx / safeHeight) * 100;

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

    const isTogglingRef = useRef(false);

    const toggleLayoutMode = (mode: 'organic' | 'grid' | 'animate') => {
        // Prevent rapid clicking breaking the layout
        if (isTogglingRef.current) return;
        isTogglingRef.current = true;
        setTimeout(() => { isTogglingRef.current = false; }, 300);

        setLayoutMode(mode);
        if (mode === 'animate') {
            setActiveIndex(0);
            setIsSidebarOpen(false);
            return;
        }

        // Stabilize shader before shuffling if not set
        if (!shaderItemId && items.length > 0 && items[0]) {
            setShaderItemId(items[0].id);
        }

        // Shuffle items for variety
        const itemsToLayout = [...items].sort(() => Math.random() - 0.5);

        if (mode === 'grid') {
            // Force a small delay to allow state to settle/DOM to update if needed, though react batching usually handles it.
            // But main safety is the debounce above.
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
            className="flex items-center justify-center w-full h-screen overflow-hidden font-sans text-[#1D1D1F] relative"
            style={{ fontFamily: FONTS[currentFontIndex].family, backgroundColor: '#f5f5f5' }}
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
                                    maskImage: windowWidth < 768 ? 'radial-gradient(ellipse at center, black 60%, transparent 100%)' : 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
                                    WebkitMaskImage: windowWidth < 768 ? 'radial-gradient(ellipse at center, black 60%, transparent 100%)' : 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
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
                            className="absolute top-6 left-6 z-50 p-3 bg-white hover:bg-[#f2f2f2] border border-[#ddd] rounded-[8px] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[#333]"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ x: -290, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -290, opacity: 0 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute top-3 left-3 z-[100] overflow-hidden"
                                style={{
                                    width: windowWidth < 768 ? 'calc(100% - 24px)' : 290,
                                    maxHeight: 837,
                                    height: 'calc(100% - 24px)',
                                    borderRadius: 20,
                                    boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div
                                    className="h-full flex flex-col bg-white overflow-y-auto custom-scrollbar gap-[28px]"
                                    style={{
                                        borderRadius: 20
                                    }}
                                >
                                    {/* --- HEADER: Logo + Title + Description --- */}
                                    <div className="flex flex-col gap-[36px] items-start px-[28px] pt-8 pb-8 border-b border-[#f2f2f2] shrink-0 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <img
                                                src={MoodLogo}
                                                alt="Mood Logo"
                                                className="w-[51px] h-[51px]"
                                            />
                                            {!isExporting && (
                                                <button
                                                    onClick={() => setIsSidebarOpen(false)}
                                                    className="p-2 hover:bg-[#f8f8f8] rounded-[8px] transition-all text-[#333]"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-[18px] w-full">
                                            {isExporting ? (
                                                <div className="text-[20px] font-medium leading-[22px] text-[#1e1e1e] w-full">
                                                    {title || "Visual Exploration #1"}
                                                </div>
                                            ) : (
                                                <input
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="Visual Exploration #1"
                                                    className="text-[20px] font-medium leading-[22px] text-[#1e1e1e] bg-transparent border-none outline-none focus:ring-0 placeholder:text-[#bcbcbc] w-full"
                                                />
                                            )}
                                            {isExporting ? (
                                                <div className="text-[14px] font-normal leading-[22px] text-[#bcbcbc] w-full pb-2">
                                                    {aboutText || "A curated description about this unique space you're curating and bring to life...."}
                                                </div>
                                            ) : (
                                                <div className="flex items-start w-full">
                                                    <textarea
                                                        value={aboutText}
                                                        onChange={(e) => setAboutText(e.target.value)}
                                                        placeholder="A curated description about this unique space you're curating and bring to life...."
                                                        className="flex-1 text-[14px] font-normal leading-[22px] text-[#bcbcbc] bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-[#bcbcbc] min-h-[88px] w-full p-0"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* --- CONTENT: Essence + Palette + Download --- */}
                                    <div className="flex flex-col justify-between px-[28px] pb-8 flex-1 min-h-0">
                                        <div className="flex flex-col gap-[40px] mb-[40px]">
                                            {/* --- Essence (Keywords) --- */}
                                            <div className="flex flex-col gap-[14px]">
                                                <h3 className="text-[16px] font-medium leading-[22px] text-[#1e1e1e]">
                                                    Essence
                                                </h3>
                                                <div className="flex flex-col gap-[10px] w-full">
                                                    {tags.map((tag, i) => (
                                                        isExporting ? (
                                                            <div key={i} className="w-full px-[14px] py-2 bg-[#f8f8f8] rounded-[8px] text-[14px] font-normal leading-[22px] text-[#bcbcbc]">
                                                                {tag || "Keyword"}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                key={i}
                                                                value={tag}
                                                                onChange={(e) => { const newTags = [...tags]; newTags[i] = e.target.value; setTags(newTags); }}
                                                                placeholder={`Keyword ${i + 1}`}
                                                                className="w-full px-[14px] py-1.5 bg-[#f8f8f8] rounded-[8px] text-[14px] font-normal leading-[22px] text-[#bcbcbc] border-none outline-none focus:bg-[#f2f2f2] placeholder:text-[#bcbcbc] transition-colors"
                                                            />
                                                        )
                                                    ))}
                                                </div>
                                            </div>

                                            {/* --- Color Palette --- */}
                                            <div className="flex flex-col gap-[14px]">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[16px] font-medium leading-[22px] text-[#1e1e1e]">
                                                        Color Palette
                                                    </h3>
                                                    {items.some(i => i.type === 'image' || i.type === 'video') && !isExporting && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updatePaletteFromAllImages([], false)}
                                                            className="px-3 py-1 rounded-[8px] text-[14px] bg-[#f8f8f8] text-[#6f6f6f] hover:bg-[#f2f2f2] transition-colors"
                                                            title="Extract colors from board images"
                                                        >
                                                            From board
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-[10px] w-full">
                                                    <div className="flex items-center justify-between w-full h-[36px]">
                                                        {[0, 1, 2, 3].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="w-[36px] h-[36px] rounded-[8px] relative overflow-hidden group cursor-pointer flex-shrink-0"
                                                                style={{ backgroundColor: (palette[i] as string) || '#f8f8f8' }}
                                                                onClick={() => (palette[i] && navigator.clipboard.writeText(palette[i] as string))}
                                                                title={(palette[i] as string) || ''}
                                                            >
                                                                {!isExporting && (
                                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Copy size={12} className="text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center justify-between w-full h-[36px]">
                                                        {[4, 5, 6, 7].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="w-[36px] h-[36px] rounded-[8px] relative overflow-hidden group cursor-pointer flex-shrink-0"
                                                                style={{ backgroundColor: (palette[i] as string) || '#f8f8f8' }}
                                                                onClick={() => (palette[i] && navigator.clipboard.writeText(palette[i] as string))}
                                                                title={(palette[i] as string) || ''}
                                                            >
                                                                {!isExporting && (
                                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Copy size={12} className="text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- Download Button --- */}
                                        <div className="pb-0 shrink-0">
                                            <button
                                                onClick={handleSave}
                                                className="w-full flex items-center justify-center gap-[10px] px-4 py-[10px] bg-[#ddd] border border-[#d5d5d5] rounded-[8px] text-[14px] font-normal leading-[21px] text-black hover:bg-[#d5d5d5] transition-colors"
                                            >
                                                <Download size={18} />
                                                <span>Download board</span>
                                            </button>
                                        </div>
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
                                        ? (items[activeIndex] || items[0] || { content: '' }).content
                                        : ((items.find(i => i.id === shaderItemId) || items[0] || { content: '' }).content)
                                    }
                                    isVideo={(layoutMode === 'animate'
                                        ? (items[activeIndex] || items[0] || { type: 'image' })
                                        : ((items.find(i => i.id === shaderItemId) || items[0] || { type: 'image' }))
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
                                    <div className="p-[26px] rounded-[20px] bg-white border border-[#ddd] shadow-[0_8px_32px_rgba(0,0,0,0.08)] pointer-events-auto">
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
                                                    // Prioritize height constraint for "show" mode to keep items consistent
                                                    // but allow width to flex up to strict screen bounds.
                                                    className="absolute flex flex-col items-center justify-center p-4 outline-none"
                                                    style={{
                                                        // Reduced height to render background more visible
                                                        height: '65vh',
                                                        width: 'auto',
                                                        minWidth: '20vh', // Prevent tiny items
                                                        maxWidth: '70vw',
                                                        // Valid for all types: CSS expects W/H. item.AR is H/W. So use 1/AR.
                                                        aspectRatio: `${1 / (item.aspectRatio || (item.type === 'pdf' ? 1.33 : 1))}`,

                                                        // Fixed centering logic
                                                        left: '50%',
                                                        x: '-50%', // translate -50%
                                                        pointerEvents: pointerEvents as any,
                                                        perspective: '1000px',
                                                        zIndex: zIndex
                                                    }}
                                                >
                                                    {/* Content */}
                                                    <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                                                        {item.isLoading ? (
                                                            <GeneratingCard borderRadius={imageRadius} />
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
                                                                    showBorders={showBorders || isExporting}
                                                                    imageRadius={imageRadius}
                                                                    borderThickness={borderThickness}
                                                                    borderStyle={borderStyle}
                                                                    borderColor={borderColor}
                                                                    shaderColors={activeShaderColors}
                                                                    isShaderActive={isShaderMode}
                                                                />
                                                            </motion.div>

                                                        ) : item.type === 'pdf' ? (
                                                            <PDFFlipBook
                                                                file={item.content}
                                                                width={600} // Fixed base width for aspect ratio calc
                                                                height={600 * (item.aspectRatio || 1.33)} // Height derived from AR
                                                                showBorders={showBorders || isExporting}
                                                                borderThickness={borderThickness}
                                                                borderStyle={borderStyle}
                                                                borderColor={borderColor}
                                                                imageRadius={imageRadius}
                                                                onAspectRatioChange={(newRatio: number) => {
                                                                    // Only update if significantly different
                                                                    if (!item.aspectRatio || Math.abs(item.aspectRatio - newRatio) > 0.01) {
                                                                        // We can access setItems from closure or pass a handler
                                                                        // Show mode is inside OrganicMoodboard component so setItems is available
                                                                        setItems((prev) => prev.map((i) =>
                                                                            i.id === item.id ? { ...i, aspectRatio: newRatio } : i
                                                                        ));
                                                                    }
                                                                }}
                                                            />
                                                        ) : item.type === 'audio' ? (
                                                            <div className={`w-full h-full bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl overflow-hidden`}
                                                                style={{
                                                                    borderRadius: `${imageRadius}px`,
                                                                    aspectRatio: '4/1' // Wide and short for audio
                                                                }}>
                                                                <AudioPlayer
                                                                    src={item.content}
                                                                    fileName={item.author}
                                                                    imageRadius={imageRadius}
                                                                    className="w-full h-full"
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
                                            updateAspectRatio={(id: string, newRatio: number) => {
                                                setItems((prev) => prev.map((i) =>
                                                    i.id === id ? { ...i, aspectRatio: newRatio } : i
                                                ));
                                            }}
                                            handleResizeStart={handleResizeStart}
                                            handleRotateStart={handleRotateStart}
                                            imageRadius={imageRadius}
                                            showBorders={showBorders || isExporting}
                                            borderThickness={borderThickness}
                                            borderStyle={borderStyle}
                                            borderColor={borderColor}
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

                        {/* --- INSPIRATION QUOTE REMOVED --- */}
                    </div>

                    {/* --- DOCK --- */}


                    {/* --- TOP RIGHT MENU / EXIT SLIDESHOW --- */}
                    {!isExporting && (
                        <div data-export-exclude="true" className="absolute top-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
                            {/* Exit Slideshow Button */}
                            <AnimatePresence>
                                {layoutMode === 'animate' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="pointer-events-auto"
                                    >
                                        <button
                                            onClick={() => {
                                                toggleLayoutMode('grid');
                                                setViewMode('editor');
                                                setIsPaused(false);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-[#e1e1e1] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white text-black transition-all group"
                                        >
                                            <X size={16} className="text-[#525252] group-hover:text-black transition-colors" strokeWidth={2} />
                                            <span className="text-[14px] font-medium leading-[21px]">Exit Slideshow</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* --- STYLE SETTINGS PANEL --- */}
                    {!isExporting && (
                        <AnimatePresence>
                            {showSettings && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="fixed bottom-[150px] left-1/2 -translate-x-1/2 flex flex-col gap-[18px] p-[28px] rounded-[20px] bg-white border border-[#e1e1e1] shadow-[0_8px_32px_rgba(0,0,0,0.08)] pointer-events-auto origin-bottom"
                                    style={{ width: 'auto', minWidth: 340, zIndex: 10000 }}
                                >
                                    {/* Tab header — Figma: gap-[12px] */}
                                    <div className="flex gap-[12px] items-center text-[14px] leading-[21px]">
                                        <button
                                            onClick={() => setSettingsTab('dashboard')}
                                            className={`transition-colors ${(settingsTab || 'dashboard') === 'dashboard' ? 'font-semibold text-black' : 'font-medium text-[#bcbcbc] hover:text-[#1e1e1e]'}`}
                                        >
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={() => setSettingsTab('item')}
                                            className={`transition-colors ${(settingsTab || 'dashboard') === 'item' ? 'font-semibold text-[#1e1e1e]' : 'font-medium text-[#bcbcbc] hover:text-[#1e1e1e]'}`}
                                        >
                                            Item
                                        </button>
                                    </div>

                                    {/* Separator + content — Figma: border-t, pt-[32px], gap-[32px] between rows */}
                                    <div className="border-t border-[#f2f2f2] pt-[32px] flex flex-col gap-[32px]">
                                        {(settingsTab || 'dashboard') === 'dashboard' && (
                                            <>
                                                {/* Radius */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Radius</span>
                                                    <div className="flex gap-5 items-center flex-1">
                                                        <span className="text-[14px] font-normal leading-[21px] text-[#1e1e1e] w-[36px] shrink-0">{dashboardRadius}px</span>
                                                        <input type="range" min="0" max="60" value={dashboardRadius} onChange={(e) => setDashboardRadius(Number(e.target.value))} className="flex-1 mood-slider" />
                                                    </div>
                                                </div>

                                                {/* Grid */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Grid</span>
                                                    <div className="flex gap-5 items-center">
                                                        <button
                                                            onClick={() => setShowGrid(!showGrid)}
                                                            className={`text-[14px] font-normal leading-[21px] transition-colors ${showGrid ? 'text-[#1e1e1e]' : 'text-[#6f6f6f]'}`}
                                                        >
                                                            {showGrid ? 'On' : 'Off'}
                                                        </button>
                                                        {showGrid && (
                                                            <button
                                                                onClick={() => setGridType(prev => prev === 'square' ? 'dot' : 'square')}
                                                                className="text-[14px] font-normal leading-[21px] text-[#6f6f6f] hover:text-[#1e1e1e] transition-colors"
                                                            >
                                                                {gridType === 'dot' ? 'Dotted' : 'Square'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Typography */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Typography</span>
                                                    <button
                                                        onClick={cycleFonts}
                                                        className="text-[14px] font-normal leading-[21px] text-[#6f6f6f] hover:text-[#1e1e1e] transition-colors"
                                                    >
                                                        Public Sans
                                                    </button>
                                                </div>

                                                {/* Background — Figma: label 100px, gap-[38px], control row gap-[10px] (Solid + circle) */}
                                                <div className="flex gap-[38px] items-start">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0 pt-0.5">Background</span>
                                                    <div className="flex flex-col gap-[10px]">
                                                        {/* Mode selector + Solid picker on same row with gap-[10px] when Solid */}
                                                        <div className="flex gap-5 items-center flex-wrap">
                                                            <div className="flex items-center gap-[10px]">
                                                                <button
                                                                    onClick={() => { setBgMode('solid'); setIsShaderMode(false); }}
                                                                    className={`text-[14px] font-normal leading-[21px] transition-colors ${bgMode === 'solid' ? 'text-[#1e1e1e]' : 'text-[#6f6f6f] hover:text-[#1e1e1e]'}`}
                                                                >
                                                                    Solid
                                                                </button>
                                                                {bgMode === 'solid' && <MinimalColorPicker value={background} onChange={setBackground} />}
                                                            </div>
                                                            <button
                                                                onClick={() => { setBgMode('gradient'); setIsShaderMode(false); }}
                                                                className={`text-[14px] font-normal leading-[21px] transition-colors ${bgMode === 'gradient' ? 'text-[#1e1e1e]' : 'text-[#6f6f6f] hover:text-[#1e1e1e]'}`}
                                                            >
                                                                Gradient
                                                            </button>
                                                            <button
                                                                onClick={() => { setBgMode('shader'); setIsShaderMode(true); }}
                                                                className={`text-[14px] font-medium leading-[21px] transition-colors ${bgMode === 'shader' ? '' : 'text-[#6f6f6f] hover:text-[#1e1e1e]'}`}
                                                                style={bgMode === 'shader' ? { background: 'linear-gradient(149deg, #9c633f 7%, #4e4e4e 116%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}
                                                            >
                                                                Shader
                                                            </button>
                                                        </div>

                                                        {/* Gradient: 3 color picker circles */}
                                                        {bgMode === 'gradient' && (
                                                            <div className="flex gap-2 items-center">
                                                                {[0, 1, 2].map((i) => (
                                                                    <MinimalColorPicker
                                                                        key={i}
                                                                        value={palette[i] || '#ffffff'}
                                                                        onChange={(hex) => updatePaletteColor(i, hex)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Shader: Soft / Blur On / Shuffle */}
                                                        {bgMode === 'shader' && (
                                                            <div className="flex gap-5 items-center text-[14px] leading-[21px]">
                                                                <button
                                                                    onClick={() => setShaderMode(shaderMode === 'soft' ? 'extreme' : 'soft')}
                                                                    className={`font-normal transition-colors ${shaderMode === 'soft' ? 'text-[#6f6f6f]' : 'text-[#6f6f6f]'}`}
                                                                >
                                                                    {shaderMode === 'soft' ? 'Soft' : 'Extreme'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEnableMotionBlur(!enableMotionBlur)}
                                                                    className={`font-medium transition-colors ${enableMotionBlur ? 'text-[#1e1e1e]' : 'text-[#6f6f6f]'}`}
                                                                >
                                                                    Blur {enableMotionBlur ? 'On' : 'Off'}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const candidates = items.filter(i => i.type === 'image' || i.type === 'video');
                                                                        if (candidates.length > 0) {
                                                                            const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
                                                                            setShaderItemId(randomItem.id);
                                                                        }
                                                                    }}
                                                                    className="font-normal text-[#6f6f6f] hover:text-[#1e1e1e] transition-colors"
                                                                >
                                                                    Shuffle
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {(settingsTab || 'dashboard') === 'item' && (
                                            <>
                                                {/* Text Size */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Text Size</span>
                                                    <div className="flex gap-5 items-center flex-1">
                                                        <span className="text-[14px] font-normal leading-[21px] text-[#1e1e1e] w-[36px] shrink-0">{quoteSize}px</span>
                                                        <input type="range" min="12" max="48" value={quoteSize} onChange={(e) => setQuoteSize(Number(e.target.value))} className="flex-1 mood-slider" />
                                                    </div>
                                                </div>

                                                {/* Border Style */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Border Style</span>
                                                    <div className="flex gap-5 items-center">
                                                        <button
                                                            onClick={() => setShowBorders(!showBorders)}
                                                            className={`text-[14px] font-normal leading-[21px] transition-colors ${showBorders ? 'text-[#1e1e1e]' : 'text-[#6f6f6f]'}`}
                                                        >
                                                            {showBorders ? 'On' : 'Off'}
                                                        </button>
                                                        {showBorders && (
                                                            <>
                                                                <button
                                                                    onClick={() => setBorderStyle('glass')}
                                                                    className={`text-[14px] font-normal leading-[21px] transition-colors ${borderStyle === 'glass' ? 'text-[#1e1e1e]' : 'text-[#6f6f6f]'}`}
                                                                >
                                                                    Glass
                                                                </button>
                                                                <button
                                                                    onClick={() => setBorderStyle('filled')}
                                                                    className={`text-[14px] font-normal leading-[21px] transition-colors ${borderStyle === 'filled' ? 'text-[#1e1e1e]' : 'text-[#6f6f6f]'}`}
                                                                >
                                                                    Filled
                                                                </button>
                                                                {borderStyle === 'filled' && (
                                                                    <MinimalColorPicker value={borderColor} onChange={setBorderColor} />
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Border Thickness */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Border Thickness</span>
                                                    <div className="flex gap-5 items-center flex-1">
                                                        <span className="text-[14px] font-normal leading-[21px] text-[#1e1e1e] w-[36px] shrink-0">{borderThickness}px</span>
                                                        <input type="range" min="0" max="40" value={borderThickness} onChange={(e) => setBorderThickness(Number(e.target.value))} className="flex-1 mood-slider" />
                                                    </div>
                                                </div>

                                                {/* Border Radius */}
                                                <div className="flex gap-[38px] items-center">
                                                    <span className="w-[100px] text-[14px] font-medium leading-[21px] text-black shrink-0">Border Radius</span>
                                                    <div className="flex gap-5 items-center flex-1">
                                                        <span className="text-[14px] font-normal leading-[21px] text-[#1e1e1e] w-[36px] shrink-0">{imageRadius}px</span>
                                                        <input type="range" min="0" max="60" value={imageRadius} onChange={(e) => setImageRadius(Number(e.target.value))} className="flex-1 mood-slider" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}

                    {/* --- BOTTOM DOCK (Figma 79:300) --- */}
                    {!isExporting && (
                        <div
                            id="dock-controls"
                            data-export-exclude="true"
                            className="absolute left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none"
                            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                        >
                            <div className="flex items-center gap-[10px] p-[10px] rounded-[20px] bg-white border border-[#e1e1e1] shadow-[0_8px_32px_rgba(0,0,0,0.08)] pointer-events-auto">
                                <AddDockButton
                                    onAddImage={() => fileInputRef.current?.click()}
                                    onAddVideo={() => fileInputRef.current?.click()}
                                    onAddText={addQuote}
                                />
                                <input type="file" multiple accept="image/*,video/mp4,audio/mpeg,audio/mp3,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                <GenerateDockButton
                                    id="tour-ai-image"
                                    onClick={handleAiGenerate}
                                    isGenerating={isGeneratingAI}
                                />
                                <BottomDockButton onClick={handleShuffle} iconSrc={ShuffleSimpleIcon} iconSrcHover={ShuffleSimpleBlackIcon} label="Shuffle" />
                                <BottomDockButton
                                    id="tour-style"
                                    onClick={() => setShowSettings(!showSettings)}
                                    icon={SlidersHorizontal}
                                    label="Style"
                                    active={showSettings}
                                />
                                <BottomDockButton
                                    id="tour-show"
                                    onClick={() => {
                                        if (layoutMode === 'animate') {
                                            setIsPaused(!isPaused);
                                        } else {
                                            toggleLayoutMode('animate');
                                            setViewMode('editor');
                                            setIsPaused(false);
                                        }
                                    }}
                                    iconSrc={SlideshowIcon}
                                    iconSrcHover={SlideshowBlackIcon}
                                    label="Slideshow"
                                    roundedClass="rounded-[8px]"
                                    active={layoutMode === 'animate' && viewMode === 'editor'}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div >
            <TourGuide onStepChange={handleTourStepChange} onComplete={() => setHasSeenTour(true)} />
        </div >
    );
};

export default OrganicMoodboard;