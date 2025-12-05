
import React, { useState, forwardRef } from 'react';
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
}

// Wrapper for Page to be compatible with HTMLFlipBook
const PageWrapper = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-sm overflow-hidden" style={{ width: props.width, height: props.height }}>
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
    previewOnly = false
}) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setIsLoading(false);
    }

    return (
        <div
            className={`w-full h-full flex items-center justify-center overflow-hidden relative transition-all duration-300 ${showBorders ? 'bg-white' : ''}`}
            style={{
                borderRadius: `${imageRadius}px`,
                // Use box-shadow for border to avoid affecting layout/clipping content
                boxShadow: showBorders
                    ? `0 0 0 ${borderThickness}px rgba(255,255,255,0.2), 0 25px 50px -12px rgba(0,0,0,0.5)`
                    : 'none',
                outline: showBorders ? '1px solid rgba(209, 213, 219, 0.6)' : 'none',
                outlineOffset: showBorders ? `${borderThickness}px` : '0px'
            }}
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag when interacting with book
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
            )}

            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => console.error("Error loading PDF document:", error)}
                loading={<div className="p-4 text-gray-400">Loading PDF...</div>}
                error={<div className="p-4 text-red-500 text-xs">Failed to load PDF</div>}
                className="flex items-center justify-center"
            >
                {numPages && (
                    previewOnly ? (
                        <div className="bg-white shadow-sm overflow-hidden" style={{ width, height }}>
                            <Page
                                pageNumber={1}
                                width={width}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                onLoadError={(error) => console.error(`Error loading page 1:`, error)}
                                error={<div className="text-red-500 text-[10px]">Page Error</div>}
                            />
                        </div>
                    ) : (
                        <HTMLFlipBook
                            key={`${width}-${height}`} // Force re-render on dimension change
                            width={width}
                            height={height}
                            size="fixed" // Use fixed size to respect exact dimensions
                            minWidth={100}
                            maxWidth={2000}
                            minHeight={100}
                            maxHeight={2000}
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
                                <PageWrapper key={`page_${index + 1}`} width={width} height={height}>
                                    <Page
                                        pageNumber={index + 1}
                                        width={width}
                                        // height={height} // Remove height to let it scale naturally
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onLoadError={(error) => console.error(`Error loading page ${index + 1}:`, error)}
                                        error={<div className="text-red-500 text-[10px]">Page Error</div>}
                                    />
                                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                        {index + 1}
                                    </div>
                                </PageWrapper>
                            ))}
                        </HTMLFlipBook>
                    )
                )}
            </Document>
            {children}
        </div>
    );
};
