import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TourStep = {
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
};

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'moodboard-canvas',
        title: "Welcome :)",
        description: "We've added some examples to get you started. Drag & drop them, or add your own images, videos, or text to curate your vibe.",
        position: 'bottom'
    },
    {
        targetId: 'tour-style',
        title: "Customize Look",
        description: "Change the look of the image/video containers in settings.",
        position: 'bottom'
    },
    {
        targetId: 'tour-show',
        title: "Show Mode",
        description: "Switch to presentation Show mode for an immersive space presentation.",
        position: 'top'
    }
];

export const TourGuide = ({ onStepChange, onComplete }: { onStepChange?: (step: number) => void, onComplete?: () => void }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [coords, setCoords] = useState<{ x: number, y: number, arrowOffset: number, placement: string }>({ x: 0, y: 0, arrowOffset: 0, placement: 'bottom' });
    const [targetRect, setTargetRect] = useState<{ rect: DOMRect; step: number } | null>(null);

    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        const step = TOUR_STEPS[currentStep];
        if (!step) return;

        const element = document.getElementById(step.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect({ rect, step: currentStep });

            const gap = 12;
            const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 362;
            const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 200;
            const screenPadding = 24;
            const viewportWidth = document.documentElement.clientWidth;

            let x = 0;
            let y = 0;
            let arrowOffset = 0;

            let effectivePosition = step.position;
            if (viewportWidth < 768 && (step.position === 'left' || step.position === 'right')) {
                effectivePosition = 'bottom';
            }

            if (step.targetId === 'moodboard-canvas') {
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
                x -= tooltipWidth / 2;
                y -= tooltipHeight / 2;
            } else {
                switch (effectivePosition) {
                    case 'top': {
                        x = rect.left + rect.width / 2;
                        y = rect.top - gap - tooltipHeight;
                        x -= tooltipWidth / 2;
                        const minX = screenPadding;
                        const maxX = viewportWidth - screenPadding - tooltipWidth;
                        x = Math.max(minX, Math.min(x, maxX));
                        arrowOffset = (rect.left + rect.width / 2) - (x + tooltipWidth / 2);
                        break;
                    }
                    case 'bottom': {
                        x = rect.left + rect.width / 2;
                        y = rect.bottom + gap;
                        x -= tooltipWidth / 2;
                        const minXBottom = screenPadding;
                        const maxXBottom = viewportWidth - screenPadding - tooltipWidth;
                        x = Math.max(minXBottom, Math.min(x, maxXBottom));
                        arrowOffset = (rect.left + rect.width / 2) - (x + tooltipWidth / 2);
                        break;
                    }
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

            const maxArrowOffset = (tooltipWidth / 2) - 24;
            arrowOffset = Math.max(-maxArrowOffset, Math.min(arrowOffset, maxArrowOffset));

            setCoords({ x, y, arrowOffset, placement: effectivePosition });
        }
    };

    useEffect(() => {
        if (!isVisible) return;

        onStepChange?.(currentStep);

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
        onComplete?.();
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {currentStep === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                        />
                    )}

                    {targetRect && targetRect.step === currentStep && currentStep > 0 && (
                        <motion.div
                            layoutId="tour-highlight"
                            className="fixed z-[10000] pointer-events-none rounded-[20px]"
                            style={{ border: '2px solid #ddd' }}
                            initial={false}
                            animate={{
                                top: targetRect.rect.top - 4,
                                left: targetRect.rect.left - 4,
                                width: targetRect.rect.width + 8,
                                height: targetRect.rect.height + 8,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}

                    {/* Tooltip Card — Figma card style */}
                    <motion.div
                        ref={tooltipRef}
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed z-[10001] w-[362px] max-w-[calc(100vw-32px)] bg-white rounded-[20px] border border-[#ddd] p-[28px]"
                        style={{
                            left: coords.x,
                            top: coords.y,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        }}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-5 right-5 p-1 rounded-[8px] text-[#999] hover:text-black hover:bg-[#f2f2f2] transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col gap-[18px]">
                            <h3 className="text-[20px] font-medium leading-[22px] text-[#2a2a2a]">
                                {step.title}
                            </h3>

                            <p className="text-[14px] font-normal leading-[22px] text-[#6f6f6f]">
                                {step.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-[26px]">
                            <span className="text-[14px] text-[#999]">
                                {currentStep + 1} of {TOUR_STEPS.length}
                            </span>
                            <button
                                onClick={handleNext}
                                className="px-[16px] py-[4px] bg-[#f8f8f8] border border-[#e6e6e6] rounded-[8px] text-[14px] text-black hover:bg-[#e6e6e6] transition-colors"
                            >
                                {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                            </button>
                        </div>

                        {/* Arrow Pointer */}
                        {step.targetId !== 'moodboard-canvas' && (
                            <div
                                className={`absolute w-3.5 h-3.5 bg-white transform rotate-45
                                    ${coords.placement === 'top' ? 'bottom-[-7px] border-r border-b border-[#ddd]' : ''}
                                    ${coords.placement === 'bottom' ? 'top-[-7px] border-l border-t border-[#ddd]' : ''}
                                    ${coords.placement === 'left' ? 'right-[-7px] top-1/2 -translate-y-1/2 border-r border-t border-[#ddd]' : ''}
                                    ${coords.placement === 'right' ? 'left-[-7px] top-1/2 -translate-y-1/2 border-l border-b border-[#ddd]' : ''}
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
