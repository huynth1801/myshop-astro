import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export interface GalleryImage {
  url: string;
  alt?: string;
  position?: number;
}

interface ProductImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

export default function ProductImageGallery({
  images = [],
  productName,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = images.length;
  const currentImage = images[selectedIndex] || images[0];

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Tự động cuộn thumbnail vào vùng nhìn thấy khi đổi ảnh
  useEffect(() => {
    if (!thumbnailsRef.current || total <= 1) return;
    const container = thumbnailsRef.current;
    const activeThumb = container.children[selectedIndex] as HTMLElement | undefined;
    if (activeThumb) {
      const thumbLeft = activeThumb.offsetLeft;
      const thumbWidth = activeThumb.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = thumbLeft - containerWidth / 2 + thumbWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedIndex, total]);

  // Hỗ trợ vuốt trên thiết bị cảm ứng (Mobile touch swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) handleNext();
    else if (diff < -40) handlePrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (!thumbnailsRef.current) return;
    thumbnailsRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (!images || total === 0) {
    return (
      <div className="aspect-square sm:aspect-[4/5] flex flex-col items-center justify-center rounded-xl border border-border bg-surface text-foreground-muted">
        <ImageIcon className="h-10 w-10 stroke-[1.25] text-foreground-muted/60 mb-2" />
        <span className="text-xs">Chưa có hình ảnh</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col" role="region" aria-label="Bộ sưu tập ảnh sản phẩm">
      {/* 1. KHUNG ẢNH CHÍNH (Main Display Image) */}
      <div
        className="group relative aspect-square sm:aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-surface/60 shadow-xs"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={currentImage?.url}
          src={currentImage?.url}
          alt={currentImage?.alt || `${productName} - Ảnh ${selectedIndex + 1}`}
          width={900}
          height={1125}
          loading={selectedIndex === 0 ? 'eager' : 'lazy'}
          fetchPriority={selectedIndex === 0 ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover object-center transition-all duration-300 ease-out"
        />

        {/* Nút lùi ảnh (Previous) */}
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Xem ảnh trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-background/85 backdrop-blur-md text-foreground shadow-md transition-all duration-200 opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-background hover:scale-105 active:scale-95 focus:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Nút tiến ảnh (Next) */}
        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Xem ảnh kế tiếp"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-background/85 backdrop-blur-md text-foreground shadow-md transition-all duration-200 opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-background hover:scale-105 active:scale-95 focus:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Huy hiệu chỉ số ảnh (1/5) */}
        {total > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium tracking-wider text-white backdrop-blur-md">
            {selectedIndex + 1} / {total}
          </div>
        )}
      </div>

      {/* 2. HÀNG THUMBNAIL BÊN DƯỚI (Thumbnail Gallery Row) */}
      {total > 1 && (
        <div className="relative mt-3 sm:mt-4 flex items-center">
          {total > 5 && (
            <button
              type="button"
              onClick={() => scrollThumbnails('left')}
              aria-label="Cuộn thumbnail sang trái"
              className="hidden sm:flex shrink-0 -ml-2 mr-1 h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 text-foreground-muted hover:text-foreground shadow-xs transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={thumbnailsRef}
            className="flex w-full items-center gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth py-1 px-0.5 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {images.map((img, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={img.url || idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  aria-label={`Chọn ảnh ${idx + 1}`}
                  aria-selected={isSelected}
                  className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-lg transition-all duration-150 cursor-pointer focus:outline-hidden ${
                    isSelected
                      ? 'border-2 border-rose-500 ring-2 ring-rose-500/25 shadow-xs scale-[1.03]'
                      : 'border border-border/80 opacity-70 hover:opacity-100 hover:border-foreground/40'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || `${productName} thumbnail ${idx + 1}`}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center"
                  />
                </button>
              );
            })}
          </div>

          {total > 5 && (
            <button
              type="button"
              onClick={() => scrollThumbnails('right')}
              aria-label="Cuộn thumbnail sang phải"
              className="hidden sm:flex shrink-0 -mr-2 ml-1 h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 text-foreground-muted hover:text-foreground shadow-xs transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
