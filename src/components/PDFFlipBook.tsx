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
// We force the wrapper to be exactly the size of the book page
const PageWrapper = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-sm overflow-hidden flex items-center justify-center" style={{ width: props.width, height: props.height }}>
            {props.children}
        </div>
    );
});
PageWrapper.displayName = 'PageWrapper';

export const PDFFlipBook: React.FC<PDFFlipBookProps> = ({
    file,
    width, // Ignored for sizing, we measure container
    height,
    showBorders = false,
    borderThickness = 0,
    imageRadius = 0,
    children,
    previewOnly = false,
    onAspectRatioChange
}) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldRenderPdf, setShouldRenderPdf] = useState(false);

    // Resize Observer State
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Use contentRect or contentBoxSize
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setContainerSize({ width, height });
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Delay PDF rendering to prevent crashes
    useEffect(() => {
        setShouldRenderPdf(false);
        const timer = setTimeout(() => {
            if (containerSize.width > 0 && containerSize.height > 0) {
                setShouldRenderPdf(true);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [file, containerSize.width, containerSize.height]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setIsLoading(false);
    }

    // Capture page dimensions when the first page loads to update parent AR
    function onPageLoadSuccess(page: any) {
        if (onAspectRatioChange) {
            const viewport = page.getViewport({ scale: 1 });
            const ratio = viewport.height / viewport.width;
            onAspectRatioChange(ratio);
        }
    }

    // Use measured size. If 0, don't render book yet.
    const renderWidth = containerSize.width;
    const renderHeight = containerSize.height;

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex items-center justify-center overflow-hidden relative transition-all duration-300 ${showBorders ? 'bg-white' : ''}`}
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
            {(!shouldRenderPdf || isLoading || renderWidth === 0) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50/50 backdrop-blur-sm transition-opacity duration-300">
                    <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
            )}

            {shouldRenderPdf && renderWidth > 0 && renderHeight > 0 && (
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => console.error("Error loading PDF document:", error)}
                    loading={<div className="p-4 text-gray-400">Loading PDF...</div>}
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
                                    onLoadError={(error) => console.error(`Error loading page 1:`, error)}
                                    error={<div className="text-red-500 text-[10px]">Page Error</div>}
                                />
                            </div>
                        ) : (
                            <HTMLFlipBook
                                key={`flipbook-${file}-${renderWidth}-${renderHeight}`} // Re-mount if dimensions change to resizing cleanly
                                width={renderWidth}
                                height={renderHeight}
                                size="fixed" // Strict fix to props
                                minWidth={10} // Allow small sizes for thumbnails
                                maxWidth={3000}
                                minHeight={10}
                                maxHeight={3000}
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
                                autoSize={true}
                                clickEventForward={true}
                                useMouseEvents={true}
                                swipeDistance={30}
                                showPageCorners={true}
                                disableFlipByClick={false}
                            >
                                {Array.from(new Array(numPages), (_, index) => (
                                    <PageWrapper key={`page_${index + 1}`} width={renderWidth} height={renderHeight}>
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Page
                                                pageNumber={index + 1}
                                                width={renderWidth}
                                                // Only pass width to maintain AR? 
                                                // If we pass both, react-pdf scales to fit.
                                                // Since Wrapper is strict, we want Page to fit inside.
                                                // Passing 'height' ensures it doesn't overflow vertically if mismatched.
                                                height={renderHeight}
                                                onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
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
