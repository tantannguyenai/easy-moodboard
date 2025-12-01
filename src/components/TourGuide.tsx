import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TourStep = {
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
};

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'moodboard-canvas', // Target the canvas specifically
        title: "Welcome to Mood",
        description: "Your space for visual exploration. Drag & drop images anywhere or use the dock to get started.",
        position: 'bottom' // Position relative to center of canvas
    },
    {
        targetId: 'tour-ai-desc',
        title: "AI Description",
        description: "Click the Sparkles icon to automatically generate a poetic description of your board's vibe.",
        position: 'right'
    },
    {
        targetId: 'tour-ai-image',
        title: "AI Image Generation",
        description: "Generate new images that perfectly match your board's aesthetic using AI.",
        position: 'top'
    },
    {
        targetId: 'tour-layout',
        title: "Fluid Layouts",
        description: "Switch instantly between a free-form organic canvas and a structured grid.",
        position: 'top'
    }
];

export const TourGuide = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [coords, setCoords] = useState<{ x: number, y: number, arrowOffset: number, placement: string }>({ x: 0, y: 0, arrowOffset: 0, placement: 'bottom' });
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Check if tour has been completed before
        // const hasSeenTour = localStorage.getItem('hasSeenTour');
        // if (hasSeenTour) {
        //     setIsVisible(false);
        // }
    }, []);

    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        const step = TOUR_STEPS[currentStep];
        if (!step) return;

        const element = document.getElementById(step.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            const gap = 12;
            // Measure actual width/height if available, fallback to defaults
            const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 320;
            const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 200;
            const screenPadding = 24;
            const viewportWidth = document.documentElement.clientWidth;

            let x = 0;
            let y = 0;
            let arrowOffset = 0;

            let effectivePosition = step.position;
            // Force vertical positioning on mobile for side-aligned steps
            if (viewportWidth < 768 && (step.position === 'left' || step.position === 'right')) {
                effectivePosition = 'bottom';
            }

            if (step.targetId === 'moodboard-canvas') {
                // Center of the canvas
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
                // Adjust for tooltip center
                x -= tooltipWidth / 2;
                y -= tooltipHeight / 2;
            } else {
                switch (effectivePosition) {
                    case 'top':
                        // Initial X is center of target
                        x = rect.left + rect.width / 2;
                        // Initial Y is ABOVE the target (subtract gap AND height)
                        y = rect.top - gap - tooltipHeight;

                        // Center tooltip horizontally relative to X
                        x -= tooltipWidth / 2;

                        // Clamp X to keep tooltip on screen
                        const minX = screenPadding;
                        const maxX = viewportWidth - screenPadding - tooltipWidth;

                        // const originalX = x; // Unused
                        x = Math.max(minX, Math.min(x, maxX));

                        // Calculate arrow offset to keep it pointing at target center
                        // Target center X is (rect.left + rect.width / 2)
                        // Tooltip center X is (x + tooltipWidth / 2)
                        // Offset is difference
                        arrowOffset = (rect.left + rect.width / 2) - (x + tooltipWidth / 2);
                        break;
                    case 'bottom':
                        x = rect.left + rect.width / 2;
                        y = rect.bottom + gap;

                        x -= tooltipWidth / 2;

                        const minXBottom = screenPadding;
                        const maxXBottom = viewportWidth - screenPadding - tooltipWidth;
                        x = Math.max(minXBottom, Math.min(x, maxXBottom));

                        arrowOffset = (rect.left + rect.width / 2) - (x + tooltipWidth / 2);
                        break;
                    case 'left':
                        x = rect.left - gap - tooltipWidth;
                        y = rect.top + rect.height / 2 - tooltipHeight / 2;
                        break;
                    case 'right':
                        x = rect.right + gap;
                        y = rect.top + rect.height / 2 - tooltipHeight / 2;
                        break;
                }
            }

            // Clamp arrow offset to keep it within the tooltip (with padding)
            const maxArrowOffset = (tooltipWidth / 2) - 24;
            arrowOffset = Math.max(-maxArrowOffset, Math.min(arrowOffset, maxArrowOffset));

            setCoords({ x, y, arrowOffset, placement: effectivePosition });
        }
    };

    useEffect(() => {
        if (!isVisible) return;

        // Small delay to ensure DOM is ready
        const timer = setTimeout(updatePosition, 100);
        window.addEventListener('resize', updatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
        };
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenTour', 'true');
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop for first step only */}
                    {currentStep === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                        />
                    )}

                    {/* Highlight Effect for target */}
                    {targetRect && (
                        <motion.div
                            layoutId="tour-highlight"
                            className="fixed z-[10000] pointer-events-none border-2 rounded-xl shadow-[0_0_20px_rgba(138,103,63,0.4)]"
                            style={{ borderColor: '#8A673F' }}
                            initial={false}
                            animate={{
                                top: targetRect.top - 4,
                                left: targetRect.left - 4,
                                width: targetRect.width + 8,
                                height: targetRect.height + 8,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}

                    {/* Tooltip Card */}
                    <motion.div
                        ref={tooltipRef}
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed z-[10001] w-80 max-w-[calc(100vw-32px)] bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-white/50"
                        style={{
                            left: coords.x,
                            top: coords.y,
                            // No transform needed for positioning anymore, handled by x/y calculation
                        }}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(138,103,63,0.1)', color: '#8A673F' }}>
                                    {currentStep + 1}
                                </span>
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                    {step.title}
                                </h3>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed">
                                {step.description}
                            </p>

                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100">
                                <span className="text-xs text-gray-400 font-medium">
                                    {currentStep + 1} of {TOUR_STEPS.length}
                                </span>
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-1 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform"
                                >
                                    {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Arrow Pointer */}
                        {step.targetId !== 'moodboard-canvas' && (
                            <div
                                className={`absolute w-4 h-4 bg-white/90 border-l border-t border-white/50 transform rotate-45
                                    ${coords.placement === 'top' ? 'bottom-[-8px] border-l-0 border-t-0 border-r border-b shadow-sm' : ''}
                                    ${coords.placement === 'bottom' ? 'top-[-8px] shadow-[-2px_-2px_5px_rgba(0,0,0,0.05)]' : ''}
                                    ${coords.placement === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2 border-l-0 border-b-0 border-r border-t shadow-sm' : ''}
                                    ${coords.placement === 'right' ? 'left-[-8px] top-1/2 -translate-y-1/2 border-r-0 border-t-0 border-l border-b shadow-[-2px_2px_5px_rgba(0,0,0,0.05)]' : ''}
                                `}
                                style={{
                                    left: (coords.placement === 'top' || coords.placement === 'bottom')
                                        ? `calc(50% + ${coords.arrowOffset}px)`
                                        : undefined,
                                    transform: (coords.placement === 'top' || coords.placement === 'bottom')
                                        ? 'translateX(-50%) rotate(45deg)'
                                        : 'rotate(45deg)'
                                }}
                            />
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
