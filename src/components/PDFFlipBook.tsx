import { useState, forwardRef, useEffect, useRef, useCallback, type FC, type ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Loader, Volume2, VolumeX } from 'lucide-react';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** Play a short page-flip sound. Uses local /page-flip.mp3 (paper flip from SoundJay, free for non-commercial use). */
function playFlipSound() {
    const snd = new Audio('/page-flip.mp3');
    snd.volume = 0.5;
    snd.play().catch(() => {
        playProceduralFlipSound();
    });
}

/** Procedural page-flip sound (soft paper rustle + light thud) via Web Audio API. */
function playProceduralFlipSound() {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const now = ctx.currentTime;
        const bufSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1200;
        noiseFilter.Q.value = 1;
        noise.connect(noiseFilter);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.08, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(thudGain);
        thudGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    } catch {
        // ignore if AudioContext unavailable
    }
}

interface PDFFlipBookProps {
    file: string;
    width: number;
    height: number;
    showBorders?: boolean;
    borderThickness?: number;
    borderStyle?: 'glass' | 'filled';
    borderColor?: string;
    imageRadius?: number;
    children?: ReactNode;
    previewOnly?: boolean;
    onAspectRatioChange?: (ratio: number) => void;
}

// Wrapper for Page to be compatible with HTMLFlipBook
const PageWrapper = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="overflow-hidden flex items-start justify-start relative">
            {props.children}
        </div>
    );
});
PageWrapper.displayName = 'PageWrapper';

export const PDFFlipBook: FC<PDFFlipBookProps> = (props) => {
    const {
        file,
        showBorders = false,
        borderThickness = 0,
        borderStyle = 'glass',
        borderColor = '#ffffff',
        imageRadius = 0,
        children,
        previewOnly = false,
        onAspectRatioChange,
    } = props;
    // State for exact container fitting
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [debouncedSize, setDebouncedSize] = useState({ width: 0, height: 0 });

    // State to hold the natural dimensions of the PDF page for AR detection
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setIsLoading(false);
    }

    // Capture page dimensions when the first page loads to update parent AR
    function onPageLoadSuccess(page: any) {
        const viewport = page.getViewport({ scale: 1 });
        // Set natural dimensions if needed
        if (pdfDimensions.width === 0) {
            setPdfDimensions({ width: viewport.width, height: viewport.height });
        }

        if (onAspectRatioChange) {
            const ratio = viewport.height / viewport.width;
            onAspectRatioChange(ratio);
        }
    }

    const handleFlip = useCallback((_e: { data: number }) => {
        if (!isMuted) playFlipSound();
    }, [isMuted]);

    // Resize Observer with Debounce/Throttling
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = (width: number, height: number) => {
            if (width > 0 && height > 0) {
                setContainerSize({ width, height });
            }
        };

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                updateSize(entry.contentRect.width, entry.contentRect.height);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Debounce effects to prevent rapid re-rendering of PDF during resize
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSize(containerSize);
        }, 200); // Wait 200ms after resize stops
        return () => clearTimeout(timer);
    }, [containerSize]);

    // Dimensions to use for rendering
    // Fallback to containerSize if debounced is 0 (initial load) to show something faster
    const renderWidth = debouncedSize.width > 0 ? debouncedSize.width : containerSize.width;
    const renderHeight = debouncedSize.height > 0 ? debouncedSize.height : containerSize.height;

    // Only render PDF if we have valid dimensions
    const canRender = renderWidth > 0 && renderHeight > 0;

    const isGlass = borderStyle === 'glass';
    const strokeColor = isGlass ? 'rgba(255,255,255,0.2)' : borderColor;
    const outlineColor = isGlass ? 'rgba(209, 213, 219, 0.6)' : borderColor;

    return (
        <div
            ref={containerRef}
            className={`group w-full h-full flex items-start justify-start overflow-hidden relative transition-all duration-300 ${showBorders && isGlass ? 'bg-white' : ''}`}
            style={{
                borderRadius: `${imageRadius}px`,
                boxShadow: showBorders
                    ? `0 0 0 ${borderThickness}px ${strokeColor}, 0 25px 50px -12px rgba(0,0,0,0.5)`
                    : 'none',
                outline: showBorders ? `1px solid ${outlineColor}` : 'none',
                outlineOffset: showBorders ? `${borderThickness}px` : '0px'
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50/50 backdrop-blur-sm transition-opacity duration-300">
                    <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
            )}

            {canRender && !previewOnly && numPages && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsMuted((m) => !m); }}
                    className="absolute top-2 left-2 z-20 p-1.5 rounded-md bg-white/90 hover:bg-white border border-gray-200/80 shadow-sm text-gray-600 hover:text-gray-800 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                    title={isMuted ? 'Unmute flip sound' : 'Mute flip sound'}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {isMuted ? <VolumeX size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}
                </button>
            )}

            {canRender && (
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => console.error("Error loading PDF document:", error)}
                    loading={null}
                    error={<div className="p-4 text-red-500 text-xs">Failed to load PDF</div>}
                    className="flex items-center justify-center w-full h-full"
                >
                    {numPages && (
                        previewOnly ? (
                            <div className="bg-white shadow-sm overflow-hidden" style={{ width: renderWidth, height: renderHeight }}>
                                <Page
                                    pageNumber={1}
                                    width={renderWidth}
                                    height={renderHeight}
                                    onLoadSuccess={onPageLoadSuccess}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </div>
                        ) : (
                            <HTMLFlipBook
                                key={`flipbook-${renderWidth}-${renderHeight}`} // Remount only when settled size changes
                                width={renderWidth}
                                height={renderHeight}
                                size="fixed"
                                minWidth={10}
                                maxWidth={5000}
                                minHeight={10}
                                maxHeight={5000}
                                maxShadowOpacity={0.75}
                                showCover={true}
                                mobileScrollSupport={true}
                                className="pdf-flip-book"
                                style={{}}
                                startPage={0}
                                drawShadow={true}
                                flippingTime={1500}
                                usePortrait={true}
                                startZIndex={0}
                                autoSize={true}
                                clickEventForward={true}
                                useMouseEvents={true}
                                swipeDistance={30}
                                showPageCorners={true}
                                disableFlipByClick={false}
                                onFlip={handleFlip}
                            >
                                {Array.from(new Array(numPages), (_, index) => (
                                    <PageWrapper key={`page_${index + 1}`}>
                                        <div className="w-full h-full flex items-start justify-start overflow-hidden">
                                            <Page
                                                pageNumber={index + 1}
                                                width={renderWidth}
                                                height={renderHeight}
                                                onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                className="block bg-white"
                                                onLoadError={(error) => console.error(`Error loading page ${index + 1}:`, error)}
                                                error={<div className="text-red-500 text-[10px]">Page Error</div>}
                                            />
                                        </div>
                                    </PageWrapper>
                                ))}
                            </HTMLFlipBook>
                        )
                    )}
                </Document>
            )}
            {children}
        </div>
    );
};
