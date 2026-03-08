import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

const MoodLogoFrame = "/mood-logo-frame.svg";
const WelcomeBgOuter = "/welcome-bg-outer.svg";
const WelcomeBgInner = "/welcome-bg-inner.svg";

// Welcome screen media from local assets (images + videos)
// Synced to files present in /public/welcoming-assets
const FLOATING_MEDIA = [
    '/welcoming-assets/08352752-9e49-49de-970a-a1ccc4a79c85.jpeg',
    '/welcoming-assets/124668f0-dc9c-4942-a66a-1c4232b7d93a.jpeg',
    '/welcoming-assets/1c642a06-414f-4c68-8ad0-9f6061d45bfd.jpeg',
    '/welcoming-assets/219d97b9-f8a1-48d8-b214-33b453ce7c15.mp4',
    '/welcoming-assets/2a791670-29a7-474b-913b-a173be2a03bc.jpeg',
    '/welcoming-assets/3a421183-9a18-4f5b-8dad-0e21f67208ab.jpeg',
    '/welcoming-assets/3b59b105-2424-4286-9899-af4429959a60.mp4',
    '/welcoming-assets/454fd3e7.mp4',
    '/welcoming-assets/49184da5-9800-418f-bad5-668c8063674e.mp4',
    '/welcoming-assets/5a710140-a6a6-48f5-a39c-ce703e05496d.jpeg',
    '/welcoming-assets/73015900.mp4',
    '/welcoming-assets/7732e828-29df-4424-a961-f9147af0a85b.jpeg',
    '/welcoming-assets/7b8e8ebf-c53a-4824-b4ec-ef55745029a1.jpeg',
    '/welcoming-assets/811a6563-35de-402a-a97b-94887753fcd1.mp4',
    '/welcoming-assets/8751ce3e-31b3-44ab-bbb5-1110ced9a185.jpeg',
    '/welcoming-assets/8db2e9ae-8335-4bd8-8f74-552081497c88.jpeg',
    '/welcoming-assets/92220bc2-a23c-4e57-a680-b43c8c31b4fb.mp4',
    '/welcoming-assets/b865f171-04cb-44eb-b3f1-fd9558faa601.mp4',
    '/welcoming-assets/b8e5de76-f7c2-4163-a55d-7c35bf09e928.jpeg',
    '/welcoming-assets/c2e16fb6-c7de-4e87-9e39-1ff8c157c625.jpeg',
    '/welcoming-assets/c8d98d4a-8285-448c-a0a6-2f54f35f2b24.jpeg',
    '/welcoming-assets/d1ead7b7-c7bf-412b-b013-427b8487a732.webp',
    '/welcoming-assets/ef2c402a-bafe-4a9b-9595-6b26d229750b.mp4',
    '/welcoming-assets/feb2e180-d395-40f7-9b85-07d4d470e942.jpeg',
];

const isVideo = (src: string) => src.endsWith('.mp4');

// Slots for floating media
const SLOT_CONFIG = [
    { w: 140, h: 190, x: -38, y: -28 }, { w: 110, h: 150, x: -20, y: 8 },
    { w: 120, h: 165, x: 28, y: -18 }, { w: 100, h: 140, x: 42, y: 22 },
    { w: 130, h: 175, x: 14, y: 38 }, { w: 90, h: 120, x: -32, y: 28 },
    { w: 115, h: 155, x: 38, y: -32 },
];

function getDepthScale(x: number, y: number): number {
    const dist = Math.sqrt(x * x + y * y) / 50;
    return 0.85 + Math.min(dist, 1) * 0.55;
}

const CONTAINERS_PER_SLOT = 2;

// --- Typewriter data ---
type TextSegment = { text: string; style?: 'gradient' | 'bold' };
interface TypewriterSentence {
    segments: TextSegment[];
}

const TYPEWRITER_SENTENCES: TypewriterSentence[] = [
    { segments: [{ text: "Hi fellow creatives :)\nI'm so happy you're here." }] },
    {
        segments: [
            { text: "I built this platform for us to experience a\n" },
            { text: "new way of ", style: 'bold' },
            { text: "moodboarding...", style: 'gradient' },
        ]
    },
    { segments: [{ text: "Beyond just static images..." }] },
    { segments: [{ text: "Beyond a lifeless board (sorry)" }] },
    {
        segments: [
            { text: "The era of the " },
            { text: "immersive experience", style: 'gradient' },
            { text: " has began..." },
        ]
    },
];

// Graceful slow shimmer — elevated saturation, still refined
const WelcomeShimmerStyle = () => (
    <style>{`
        @keyframes welcome-shimmer {
            0%   { background-position: 0% center; }
            100% { background-position: 300% center; }
        }
        .welcome-shimmer-text {
            background: linear-gradient(
                90deg,
                #e8924a 0%,
                #d97bb0 30%,
                #9f8fd4 55%,
                #72a8d8 80%,
                #e8924a 100%
            );
            background-size: 300% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: welcome-shimmer 8s linear infinite;
            font-weight: 600;
        }
    `}</style>
);

// ---- Web Audio sound helpers ----

// Modern Macbook keyboard click — soft thud + plastic snick
function playTypewriterTick() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Very short duration: 15ms to 25ms
        const duration = 0.015 + Math.random() * 0.01;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // 1. The main "thud" (membrane/butterfly mechanism impact)
        const thudFilter = ctx.createBiquadFilter();
        thudFilter.type = 'lowpass';
        // Macbook keys are very muffled, around 500-800Hz
        thudFilter.frequency.value = 500 + Math.random() * 300;

        // 2. The high-pitched "snick" (fingertip on plastic)
        const clickFilter = ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        // High frequency snick, randomizing around 4kHz-5.5kHz
        clickFilter.frequency.value = 4000 + Math.random() * 1500;
        clickFilter.Q.value = 1.0;

        // Envelopes
        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.6 + Math.random() * 0.2, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        const clickGain = ctx.createGain();
        const clickDuration = Math.min(0.01, duration); // click ends even faster
        clickGain.gain.setValueAtTime(0.15 + Math.random() * 0.1, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + clickDuration);

        // Connections (run in parallel)
        source.connect(thudFilter);
        thudFilter.connect(thudGain);
        thudGain.connect(ctx.destination);

        source.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(ctx.destination);

        source.start();
        source.stop(ctx.currentTime + duration);
        source.onended = () => ctx.close();
    } catch (_) { /* silently fail */ }
}

// Ethereal portal sound — sweeping harp arpeggio with overtones, ~2.5s
function playPortalSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;

        // Rich arpeggio: two octaves of a C major 7 chord, ascending then one high shimmer
        const notes = [
            { freq: 261.63, delay: 0.00, dur: 2.8 },   // C4
            { freq: 329.63, delay: 0.08, dur: 2.7 },   // E4
            { freq: 392.00, delay: 0.16, dur: 2.6 },   // G4
            { freq: 493.88, delay: 0.24, dur: 2.5 },   // B4
            { freq: 523.25, delay: 0.32, dur: 2.4 },   // C5
            { freq: 659.25, delay: 0.40, dur: 2.3 },   // E5
            { freq: 783.99, delay: 0.48, dur: 2.2 },   // G5
            { freq: 987.77, delay: 0.56, dur: 2.0 },   // B5
            { freq: 1046.5, delay: 0.62, dur: 1.9 },   // C6 — peak shimmer
            { freq: 1318.5, delay: 0.68, dur: 1.6 },   // E6 — high sparkle
        ];

        notes.forEach(({ freq, delay, dur }, i) => {
            // Main tone (sine)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            // Gentle vibrato for richness
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 5.5;
            lfoGain.gain.value = freq * 0.004;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now + delay);
            lfo.stop(now + delay + dur);

            // Volume envelope: quick bloom, long gentle fade
            const peak = 0.18 - i * 0.012;
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(peak, now + delay + 0.14);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + dur + 0.05);

            // Add a soft harmonic overtone at 2x freq for sparkle
            if (i >= 5) {
                const harm = ctx.createOscillator();
                const harmGain = ctx.createGain();
                harm.type = 'sine';
                harm.frequency.value = freq * 2;
                harmGain.gain.setValueAtTime(0, now + delay);
                harmGain.gain.linearRampToValueAtTime(peak * 0.25, now + delay + 0.1);
                harmGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur * 0.7);
                harm.connect(harmGain);
                harmGain.connect(ctx.destination);
                harm.start(now + delay);
                harm.stop(now + delay + dur);
            }
        });

        setTimeout(() => ctx.close(), 3500);
    } catch (_) { /* silently fail */ }
}

// Render all segments of a sentence fully (for completed sentences)
function renderFullSentence(sentence: TypewriterSentence) {
    return sentence.segments.map((seg, i) => {
        if (seg.style === 'gradient') {
            return <span key={i} className="welcome-shimmer-text">{seg.text}</span>;
        } else if (seg.style === 'bold') {
            return <span key={i} className="font-medium text-black">{seg.text}</span>;
        }
        return <span key={i}>{seg.text}</span>;
    });
}

// Typewriter hook — graceful, deliberate typing with optional sound
function useTypewriter(sentence: TypewriterSentence, active: boolean, speed = 82, sound = false) {
    const fullText = sentence.segments.map(s => s.text).join('');
    const [charIndex, setCharIndex] = useState(0);
    const [done, setDone] = useState(false);
    const lastPlayedRef = useRef(-1);

    useEffect(() => {
        if (!active) return;
        setCharIndex(0);
        setDone(false);
        lastPlayedRef.current = -1;
    }, [active, sentence]);

    useEffect(() => {
        if (!active || charIndex >= fullText.length) {
            if (active && charIndex >= fullText.length) setDone(true);
            return;
        }
        // Play soft tick sound every 2 chars (not on spaces or newlines) for subtlety
        if (sound && charIndex !== lastPlayedRef.current) {
            const ch = fullText[charIndex];
            if (ch !== ' ' && ch !== '\n' && charIndex % 2 === 0) {
                playTypewriterTick();
            }
            lastPlayedRef.current = charIndex;
        }
        const timeout = setTimeout(() => setCharIndex(prev => prev + 1), speed);
        return () => clearTimeout(timeout);
    }, [active, charIndex, fullText.length, speed, sound]);

    const rendered: React.ReactNode[] = [];
    let consumed = 0;
    for (let i = 0; i < sentence.segments.length; i++) {
        const seg = sentence.segments[i];
        const segLen = seg.text.length;
        const segStart = consumed;
        const visibleChars = Math.max(0, Math.min(charIndex - segStart, segLen));

        if (visibleChars > 0) {
            const visibleText = seg.text.slice(0, visibleChars);
            if (seg.style === 'gradient') {
                rendered.push(<span key={i} className="welcome-shimmer-text">{visibleText}</span>);
            } else if (seg.style === 'bold') {
                rendered.push(<span key={i} className="font-medium text-black">{visibleText}</span>);
            } else {
                rendered.push(<span key={i}>{visibleText}</span>);
            }
        }
        consumed += segLen;
    }

    return { rendered, done };
}

// Single sentence component
const TypewriterSentenceView = ({
    sentence,
    onDone,
}: {
    sentence: TypewriterSentence;
    onDone: () => void;
}) => {
    const { rendered, done } = useTypewriter(sentence, true, 82, true);
    const calledDone = useRef(false);

    useEffect(() => {
        if (done && !calledDone.current) {
            calledDone.current = true;
            // Longer pause after each sentence — feels more considered
            const timer = setTimeout(onDone, 2500);
            return () => clearTimeout(timer);
        }
    }, [done, onDone]);

    return (
        <div
            className="text-center text-[14px] font-normal leading-[22px] text-[#6f6f6f] whitespace-pre-wrap"
            style={{ fontFamily: "'Public Sans', sans-serif" }}
        >
            {rendered}
            {!done && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    className="inline-block w-[1px] h-[14px] bg-[#9a9a9a] ml-[1px] align-middle"
                />
            )}
        </div>
    );
};

// Transition variants — NO y movement, just blur + fade in place
const sentenceVariants = {
    enter: { opacity: 0, filter: 'blur(10px)' },
    center: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
    exit: {
        opacity: 0,
        filter: 'blur(10px)',
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
};

interface WelcomeScreenProps {
    onEnter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 25 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 25 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        mouseX.set(x * 40);
        mouseY.set(y * 40);
    }, [mouseX, mouseY]);

    const handleMouseLeave = useCallback(() => {
        mouseX.set(0);
        mouseY.set(0);
    }, [mouseX, mouseY]);

    const [currentSentence, setCurrentSentence] = useState(0);
    const [allDone, setAllDone] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const isLastSentence = currentSentence === TYPEWRITER_SENTENCES.length - 1;

    const handleSentenceDone = useCallback(() => {
        if (currentSentence < TYPEWRITER_SENTENCES.length - 1) {
            setCurrentSentence(prev => prev + 1);
        } else {
            setAllDone(true);
        }
    }, [currentSentence]);

    const handleJoinNow = useCallback(() => {
        playPortalSound();
        setIsExiting(true);
        // Give the speed-up + white flash time to play before unmounting
        setTimeout(onEnter, 1200);
    }, [onEnter]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-[#f5f5f5]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <WelcomeShimmerStyle />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.img
                    src={WelcomeBgOuter}
                    alt=""
                    className="absolute pointer-events-none select-none origin-center"
                    style={{ width: '103.4%', height: 'auto', bottom: '-0.03%', right: 0 }}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{
                        opacity: 1,
                        scale: [0.9, 1.2, 0.9],
                    }}
                    transition={{
                        opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                        scale: { duration: 8, ease: 'easeInOut', repeat: Infinity },
                    }}
                />
                <motion.img
                    src={WelcomeBgInner}
                    alt=""
                    className="absolute pointer-events-none select-none origin-center"
                    style={{ width: '76.3%', height: 'auto', bottom: '14.2%', right: '13.5%' }}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{
                        opacity: [0.9, 1, 0.9],
                        scale: [0.9, 1.2, 0.9],
                    }}
                    transition={{
                        opacity: { duration: 7, ease: 'easeInOut', repeat: Infinity, delay: 0.3 },
                        scale: { duration: 7, ease: 'easeInOut', repeat: Infinity, delay: 0.3 },
                    }}
                />
            </div>

            {/* Floating media cards — same 3D stream, just speed controlled by isExiting */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    x: springX,
                    y: springY,
                    perspective: 800,
                    perspectiveOrigin: '50% 50%',
                    transformStyle: 'preserve-3d',
                }}
            >
                {SLOT_CONFIG.map((slot, slotIdx) => {
                    const depthScale = getDepthScale(slot.x, slot.y);
                    // Normal: 8–11s loop. On exit: 0.8–1.1s (10x faster)
                    const baseDuration = isExiting
                        ? (8 + (slotIdx % 4)) / 10
                        : 8 + (slotIdx % 4);

                    return (
                        <motion.div
                            key={slotIdx}
                            className="absolute left-1/2 top-1/2 pointer-events-auto"
                            style={{
                                width: slot.w,
                                height: slot.h,
                                transform: `translate(-50%, -50%) translate(${slot.x}vw, ${slot.y}vh) scale(${depthScale})`,
                                transformStyle: 'preserve-3d',
                                transformOrigin: 'center center',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 + slotIdx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {Array.from({ length: CONTAINERS_PER_SLOT }).map((_, containerIdx) => {
                                const phaseOffset = (containerIdx / CONTAINERS_PER_SLOT) * baseDuration;
                                const mediaIdx = (slotIdx * CONTAINERS_PER_SLOT + containerIdx) % FLOATING_MEDIA.length;
                                const mediaSrc = FLOATING_MEDIA[mediaIdx];
                                return (
                                    <div
                                        key={containerIdx}
                                        className="stream-container absolute inset-0 rounded-lg overflow-hidden border border-[#dbdbdb] bg-white shadow-lg"
                                        style={{
                                            '--stream-duration': `${baseDuration}s`,
                                            '--stream-delay': `-${phaseOffset}s`,
                                        } as React.CSSProperties}
                                    >
                                        {isVideo(mediaSrc) ? (
                                            <video
                                                src={mediaSrc}
                                                className="w-full h-full object-cover pointer-events-none"
                                                autoPlay loop muted playsInline
                                            />
                                        ) : (
                                            <img
                                                src={mediaSrc}
                                                alt=""
                                                className="w-full h-full object-cover pointer-events-none"
                                                loading="eager"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    );
                })}

                <style>{`
                    @keyframes streamTowardUser {
                        0%   { transform: translateZ(-350px); opacity: 0; }
                        6%   { opacity: 1; }
                        94%  { opacity: 1; }
                        100% { transform: translateZ(350px); opacity: 0; }
                    }
                    .stream-container {
                        transform-style: preserve-3d;
                        animation: streamTowardUser var(--stream-duration, 8s) linear infinite;
                        animation-delay: var(--stream-delay, 0s);
                    }
                `}</style>
            </motion.div>

            {/* Logo */}
            <motion.img
                src={MoodLogoFrame}
                alt="Mood"
                className="absolute z-10 w-[54px] h-[54px] left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ top: '10%' }}
                initial={{ opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Typewriter — fixed at true center of the screen */}
            <div className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] min-h-[50px] flex items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                    {!allDone && !isLastSentence && (
                        <motion.div
                            key={currentSentence}
                            variants={sentenceVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            <TypewriterSentenceView
                                sentence={TYPEWRITER_SENTENCES[currentSentence]}
                                onDone={handleSentenceDone}
                            />
                        </motion.div>
                    )}

                    {isLastSentence && !allDone && (
                        <motion.div
                            key="last-sentence"
                            variants={sentenceVariants}
                            initial="enter"
                            animate="center"
                        >
                            <TypewriterSentenceView
                                sentence={TYPEWRITER_SENTENCES[currentSentence]}
                                onDone={handleSentenceDone}
                            />
                        </motion.div>
                    )}

                    {allDone && (
                        <motion.div
                            key="final-text"
                            initial={{ opacity: 1, filter: 'blur(0px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            className="text-center text-[14px] font-normal leading-[22px] text-[#6f6f6f] whitespace-pre-wrap"
                            style={{ fontFamily: "'Public Sans', sans-serif" }}
                        >
                            {renderFullSentence(TYPEWRITER_SENTENCES[TYPEWRITER_SENTENCES.length - 1])}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Join Now button */}
            <AnimatePresence>
                {allDone && !isExiting && (
                    <motion.button
                        initial={{ opacity: 0, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.9 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        onClick={handleJoinNow}
                        className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-auto px-[16px] py-[4px] rounded-[8px] bg-[#f8f8f8] border border-white text-[14px] font-normal leading-[22px] text-[#6f6f6f] cursor-pointer hover:bg-white hover:border-[#e0e0e0] transition-all duration-200"
                        style={{ bottom: '12%', fontFamily: "'Public Sans', sans-serif" }}
                    >
                        Join Now
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Skip — bottom of screen, always visible so user can skip the animation */}
            {!isExiting && (
                <button
                    type="button"
                    onClick={handleJoinNow}
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-auto text-[14px] font-normal leading-[22px] text-[#9a9a9a] hover:text-[#6f6f6f] cursor-pointer transition-colors duration-200"
                    style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))', fontFamily: "'Public Sans', sans-serif" }}
                >
                    Skip
                </button>
            )}

            {/* White flash overlay — fades in during exit for cinematic transition */}
            <motion.div
                className="absolute inset-0 z-20 pointer-events-none"
                style={{ background: 'white' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isExiting ? 1 : 0 }}
                transition={{ duration: 0.9, delay: isExiting ? 0.15 : 0, ease: [0.4, 0, 0.2, 1] }}
            />
        </motion.div>
    );
};
