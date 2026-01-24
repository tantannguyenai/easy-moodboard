import React, { useState, forwardRef, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Loader } from 'lucide-react';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFFlipBookProps {
    file: string;
    width: number;
    height: number;
    showBorders?: boolean;
    borderThickness?: number;
    imageRadius?: number;
    children?: React.ReactNode;
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

export const PDFFlipBook: React.FC<PDFFlipBookProps> = ({
    file,
    width,
    height,
    showBorders = false,
    borderThickness = 0,
    imageRadius = 0,
    children,
    previewOnly = false,
    onAspectRatioChange
}) => {
    // State for exact container fitting
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [debouncedSize, setDebouncedSize] = useState({ width: 0, height: 0 });

    // State to hold the natural dimensions of the PDF page for AR detection
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex items-start justify-start overflow-hidden relative transition-all duration-300 ${showBorders ? 'bg-white' : ''}`}
            style={{
                borderRadius: `${imageRadius}px`,
                boxShadow: showBorders
                    ? `0 0 0 ${borderThickness}px rgba(255,255,255,0.2), 0 25px 50px -12px rgba(0,0,0,0.5)`
                    : 'none',
                outline: showBorders ? '1px solid rgba(209, 213, 219, 0.6)' : 'none',
                outlineOffset: showBorders ? `${borderThickness}px` : '0px'
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50/50 backdrop-blur-sm transition-opacity duration-300">
                    <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
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
                                size="fixed" // Explicitly fix to container size
                                minWidth={10}
                                maxWidth={5000}
                                minHeight={10}
                                maxHeight={5000}
                                maxShadowOpacity={0.5}
                                showCover={true}
                                mobileScrollSupport={true}
                                className=""
                                style={{}}
                                startPage={0}
                                drawShadow={true}
                                flippingTime={1000}
                                usePortrait={true}
                                startZIndex={0}
                                autoSize={true} // Auto adjust single/double page
                                clickEventForward={true}
                                useMouseEvents={true}
                                swipeDistance={30}
                                showPageCorners={true}
                                disableFlipByClick={false}
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
