import React, { useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import MoodLogo from '../../mood/src/assets/moodlogo.svg';

// Welcome screen images from local assets
const FLOATING_IMAGES = [
    '/welcoming-assets/2d73b2df-b213-4cda-8f7c-60d733eca762.jpeg',
    '/welcoming-assets/475c01c5-cf4f-49f5-a43a-025bec82d4ff.jpeg',
    '/welcoming-assets/752e9203-b55d-4033-885c-ea76dab716cc.jpeg',
    '/welcoming-assets/8751ce3e-31b3-44ab-bbb5-1110ced9a185.jpeg',
    '/welcoming-assets/8c840b84-1eb2-4972-8b0b-fe6d79f391c6.jpeg',
    '/welcoming-assets/94efff16-2a5b-4151-bea4-7b215c6b874b.jpeg',
    '/welcoming-assets/9b5b48fc-0d70-42e3-967d-840dd9a7570e.jpeg',
    '/welcoming-assets/a07aedf7-d525-4130-8f48-ae19124e6e4a.jpeg',
    '/welcoming-assets/08352752-9e49-49de-970a-a1ccc4a79c85.jpeg',
    '/welcoming-assets/8db2e9ae-8335-4bd8-8f74-552081497c88.jpeg',
    '/welcoming-assets/b240fc02-b0e1-41e1-956c-650d49f00c7a.jpeg',
    '/welcoming-assets/be761003-b477-4d60-a746-5e6949031d7f.jpeg',
    '/welcoming-assets/e5fd4f61-2ec6-41bb-a059-0e1c5ddedcad.jpeg',
];

// Slots: fewer positions for a calmer look
const SLOT_CONFIG = [
    { w: 140, h: 190, x: -38, y: -28 }, { w: 110, h: 150, x: -20, y: 8 },
    { w: 120, h: 165, x: 28, y: -18 },  { w: 100, h: 140, x: 42, y: 22 },
    { w: 130, h: 175, x: 14, y: 38 },   { w: 90, h: 120, x: -32, y: 28 },
    { w: 115, h: 155, x: 38, y: -32 },
];

function getDepthScale(x: number, y: number): number {
    const dist = Math.sqrt(x * x + y * y) / 50;
    return 0.85 + Math.min(dist, 1) * 0.55;
}

// Two containers per slot for seamless loop (one visible while other resets)
const CONTAINERS_PER_SLOT = 2;

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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden cursor-pointer bg-[#f9f9f9]"
            onClick={onEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Perspective container - all content part of same 3D canvas */}
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
                {/* Per-slot: fixed position. Multiple containers per slot stream far→near (no reset flash) */}
                {SLOT_CONFIG.map((slot, slotIdx) => {
                    const depthScale = getDepthScale(slot.x, slot.y);
                    const baseDuration = 8 + (slotIdx % 4);
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
                            const imgIdx = (slotIdx * CONTAINERS_PER_SLOT + containerIdx) % FLOATING_IMAGES.length;
                            return (
                            <div
                                key={containerIdx}
                                className="stream-container absolute inset-0 rounded-lg overflow-hidden border border-[#dbdbdb] bg-white shadow-lg cursor-pointer"
                                style={{
                                    '--stream-duration': `${baseDuration}s`,
                                    '--stream-delay': `-${phaseOffset}s`,
                                } as React.CSSProperties}
                            >
                                <img
                                    src={FLOATING_IMAGES[imgIdx]}
                                    alt=""
                                    className="w-full h-full object-cover pointer-events-none"
                                    loading="eager"
                                />
                            </div>
                            );
                        })}
                    </motion.div>
                    );
                })}

                {/* CSS: containers stream from deep (z:-350) to close (z:350), fade in/out to hide loop reset */}
                <style>{`
                    @keyframes streamTowardUser {
                        0% { transform: translateZ(-350px); opacity: 0; }
                        6% { opacity: 1; }
                        94% { opacity: 1; }
                        100% { transform: translateZ(350px); opacity: 0; }
                    }
                    .stream-container {
                        transform-style: preserve-3d;
                        animation: streamTowardUser var(--stream-duration, 8s) linear infinite;
                        animation-delay: var(--stream-delay, 0s);
                    }
                `}</style>

                {/* Center content - choreographed reveal */}
                <motion.div
                    className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center pointer-events-auto"
                    style={{
                        x: '-50%',
                        y: '-50%',
                        z: 0,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    <motion.img
                        src={MoodLogo}
                        alt="Mood"
                        className="w-28 md:w-36 h-auto"
                        initial={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.7, delay: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.p
                        className="mt-5 text-center text-base text-black font-normal leading-relaxed max-w-[200px]"
                        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        Where your inspiration turns alive
                    </motion.p>
                    <motion.p
                        className="mt-6 text-xs font-medium text-gray-400 tracking-widest uppercase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 1.9, ease: [0.22, 1, 0.36, 1] }}
                    >
                        Click anywhere to begin
                    </motion.p>
                </motion.div>
            </motion.div>

            {/* Platform description - bottom */}
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-sm text-gray-400 max-w-xl px-6 leading-relaxed">
                {(
                    'Mood is a creative canvas for curating visual inspiration. Add images, videos, quotes, and more—then arrange, style, and blend them into moodboards that capture your vision. Use AI to generate new images from your collection or describe your board in one click.'
                )
                    .split(/\s+/)
                    .map((word, i) => (
                        <motion.span
                            key={i}
                            className="inline"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.4,
                                delay: 2.2 + i * 0.035,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            {word}{' '}
                        </motion.span>
                    ))}
            </p>
        </motion.div>
    );
};
