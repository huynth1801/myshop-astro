import { useState, useEffect, useRef, useCallback } from 'react';

export interface LookbookItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  material: string;
  imageUrl: string;
}

const DEFAULT_SLIDES: LookbookItem[] = [
  {
    id: '01',
    tag: 'Lookbook No. 01',
    title: 'Linen Relaxed Set',
    subtitle: 'Áo thun ngà & Quần âu xếp ly',
    material: '100% Organic Linen',
    imageUrl: '/images/hero/lookbook-1.jpg',
  },
  {
    id: '02',
    tag: 'Lookbook No. 02',
    title: 'Minimalist Trench Coat',
    subtitle: 'Áo khoác dáng rộng & Quần suông',
    material: 'Vải dệt chéo chống nhăn',
    imageUrl: '/images/hero/lookbook-2.jpg',
  },
  {
    id: '03',
    tag: 'Lookbook No. 03',
    title: 'Charcoal Merino Knit',
    subtitle: 'Áo dệt kim than chì & Quần màu đá',
    material: 'Len Merino cao cấp thoáng khí',
    imageUrl: '/images/hero/lookbook-3.jpg',
  },
];

export default function HeroLookbookSlider({
  slides = DEFAULT_SLIDES,
  detailImageUrl = '/images/hero/lookbook-detail.jpg',
}: {
  slides?: LookbookItem[];
  detailImageUrl?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 4500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const active = slides[currentIndex] ?? slides[0];

  return (
    <div
      className="relative grid grid-cols-12 gap-3.5 sm:gap-4 items-end"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0]?.clientX ?? 0 - touchStartX.current;
        if (deltaX > 40) prevSlide();
        else if (deltaX < -40) nextSlide();
        touchStartX.current = null;
      }}
    >
      {/* 1. Main Model Slider Frame (4:5 Aspect Ratio) */}
      <div className="col-span-8 sm:col-span-7 relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-muted">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 h-full w-full transition-all duration-700 ease-out ${
              idx === currentIndex
                ? 'opacity-100 scale-100 z-10'
                : 'opacity-0 scale-[1.04] pointer-events-none z-0'
            }`}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              width={800}
              height={1000}
              loading={idx === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover object-center"
            />
          </div>
        ))}

        {/* Floating Top Pill Badge */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-background shadow-sm">
            {active.tag}
          </span>
          <span className="rounded-full border border-border bg-background/90 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground backdrop-blur-sm">
            0{currentIndex + 1} / 0{total}
          </span>
        </div>

        {/* Bottom Inset Info Bar & Controls */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-3.5 sm:p-4 text-white">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                {active.material}
              </p>
              <h3 className="truncate text-xs sm:text-sm font-medium tracking-tight text-white mt-0.5">
                {active.title}
              </h3>
            </div>

            {/* Micro Slider Arrows */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Lookbook trước"
                className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white hover:text-black active:scale-95"
              >
                ←
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Lookbook tiếp theo"
                className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white hover:text-black active:scale-95"
              >
                →
              </button>
            </div>
          </div>

          {/* Segmented Progress Indicators */}
          <div className="mt-3 flex gap-1.5" role="tablist" aria-label="Danh sách lookbook">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Chuyển đến ${s.tag}`}
                onClick={() => setCurrentIndex(idx)}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/30 transition hover:bg-white/50"
              >
                <span
                  className={`absolute inset-0 h-full rounded-full bg-white transition-all duration-300 ${
                    idx === currentIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Secondary Fabric Tile & Caption Block */}
      <div className="col-span-4 sm:col-span-5 flex flex-col gap-3.5 sm:gap-4">
        <div className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
          <img
            src={detailImageUrl}
            alt="Chi tiết chất liệu tự nhiên thủ công"
            width={500}
            height={500}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="pointer-events-none absolute bottom-2 left-2 right-2">
            <span className="inline-block rounded-full border border-border bg-background/90 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-foreground backdrop-blur-sm">
              Cận cảnh thớ vải
            </span>
          </div>
        </div>

        {/* Editorial Story Caption */}
        <div className="rounded-md border border-border bg-surface p-3.5 sm:p-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
            Chất liệu thủ công
          </p>
          <p className="mt-1 text-xs font-medium text-foreground leading-snug">
            {active.subtitle}
          </p>
          <a
            href="#philosophy"
            className="mt-2.5 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent underline-offset-4 hover:underline"
          >
            Khám phá thớ vải →
          </a>
        </div>
      </div>
    </div>
  );
}
