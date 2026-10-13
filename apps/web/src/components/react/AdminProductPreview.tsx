import { useState } from 'react';
import {
  ExternalLink,
  Eye,
  Globe,
  LayoutGrid,
  Plus,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import type { AdminProductDetail } from '../../lib/api/admin';
import { resolveImageUrl } from '../../lib/api/urls';
import { formatCents } from '../../lib/money';

interface Props {
  detail: AdminProductDetail;
}

type PreviewTab = 'card' | 'mobile' | 'seo';

export default function AdminProductPreview({ detail }: Props) {
  const [tab, setTab] = useState<PreviewTab>('card');
  const [hovered, setHovered] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const images = detail.images || [];
  const primaryImage = images[0];
  const hoverImage = images[1];
  const primarySrc = resolveImageUrl(primaryImage?.url);
  const hoverSrc = resolveImageUrl(hoverImage?.url);

  const variants = detail.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || '',
  );

  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const inStock = totalStock > 0;

  const minPrice =
    variants.length > 0 ? Math.min(...variants.map((v) => v.priceCents)) : null;
  const maxPrice =
    variants.length > 0 ? Math.max(...variants.map((v) => v.priceCents)) : null;

  const minCompareAt =
    variants.length > 0
      ? Math.min(...variants.map((v) => v.compareAtPriceCents ?? v.priceCents))
      : null;

  const hasDiscount =
    minCompareAt != null && minPrice != null && minCompareAt > minPrice;

  const discountPercent =
    hasDiscount && minCompareAt
      ? Math.round((1 - minPrice / minCompareAt) * 100)
      : 0;

  const isNew =
    detail.createdAt != null &&
    Date.now() - Date.parse(detail.createdAt) < 14 * 24 * 3600 * 1000;

  const currentPreviewSrc =
    resolveImageUrl(images[activeImageIdx]?.url) || primarySrc;

  const metaDesc = (
    detail.shortDescription ||
    detail.description ||
    'Đồ dùng hàng ngày được chọn kỹ — chọn ít, dùng lâu. Miễn phí giao hàng cho đơn từ 500K.'
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
      {/* Header with Title & Storefront Link */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Xem trước ngoài shop
          </h2>
        </div>
        <a
          href={`/products/${detail.slug}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          title="Mở trang sản phẩm thực tế trên shop"
        >
          <span>Xem web</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mt-3 flex rounded-lg bg-muted/60 p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab('card')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition ${
            tab === 'card'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>Thẻ sản phẩm</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('mobile')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition ${
            tab === 'mobile'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Trang chi tiết</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('seo')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition ${
            tab === 'seo'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Google SEO</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-4">
        {/* TAB 1: STOREFRONT CATALOG CARD PREVIEW */}
        {tab === 'card' && (
          <div className="mx-auto max-w-[280px]">
            <article className="group relative flex flex-col">
              {/* Image Container with 4:5 Aspect Ratio */}
              <div
                className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-muted/30"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                {primarySrc ? (
                  <>
                    <img
                      src={primarySrc}
                      alt={primaryImage?.alt || detail.name}
                      className={`h-full w-full object-cover object-center transition-all duration-300 ${
                        hoverSrc && hovered
                          ? 'opacity-0 scale-100'
                          : 'opacity-100 group-hover:scale-105'
                      }`}
                    />
                    {hoverSrc && (
                      <img
                        src={hoverSrc}
                        alt=""
                        aria-hidden="true"
                        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
                          hovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Chưa có hình ảnh
                  </div>
                )}

                {/* Badges on Top-Left */}
                <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1">
                  {!inStock ? (
                    <span className="rounded-full bg-border/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xs">
                      Hết hàng
                    </span>
                  ) : isNew ? (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background shadow-xs">
                      Mới ra mắt
                    </span>
                  ) : null}

                  {discountPercent > 0 && inStock && (
                    <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-xs">
                      −{discountPercent}%
                    </span>
                  )}
                </div>

                {/* Slide-Up Quick Add Pill Button Mock */}
                {inStock && (
                  <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex justify-center opacity-90 transition-transform group-hover:translate-y-0">
                    <div className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-foreground/90 px-3.5 text-[10px] font-semibold uppercase tracking-wider text-background shadow-md backdrop-blur-xs">
                      <span>Thêm nhanh</span>
                      <Plus className="h-3 w-3" />
                    </div>
                  </div>
                )}
              </div>

              {/* Product Metadata Block */}
              <div className="mt-2.5 flex flex-col gap-0.5 px-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {detail.category.name}
                </p>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                    {detail.name}
                  </h3>
                  <div className="shrink-0 text-right">
                    {minPrice != null ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {formatCents(minPrice)}
                          {minPrice !== maxPrice && (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              +
                            </span>
                          )}
                        </span>
                        {hasDiscount && minCompareAt != null && (
                          <span className="text-[10px] tabular-nums text-muted-foreground line-through">
                            {formatCents(minCompareAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Ngừng bán
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>

            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              {hoverSrc
                ? 'Rê chuột vào ảnh để xem hiệu ứng đổi ảnh hover.'
                : 'Thêm ảnh thứ 2 để có hiệu ứng đổi ảnh khi khách rê chuột.'}
            </p>
          </div>
        )}

        {/* TAB 2: MOBILE PRODUCT DETAIL PAGE (PDP) PREVIEW */}
        {tab === 'mobile' && (
          <div className="rounded-2xl border border-border bg-background p-3 shadow-sm space-y-3">
            {/* Phone Top Mock Bar */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2 text-[10px] text-muted-foreground">
              <span className="font-mono">9:41</span>
              <span className="font-semibold uppercase tracking-wider text-foreground">
                myshop.
              </span>
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>

            {/* Breadcrumb */}
            <p className="text-[10px] text-muted-foreground truncate">
              Trang chủ / {detail.category.name} /{' '}
              <span className="text-foreground">{detail.name}</span>
            </p>

            {/* Main Product Image Carousel */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted/30">
              {currentPreviewSrc ? (
                <img
                  src={currentPreviewSrc}
                  alt={detail.name}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Chưa có ảnh
                </div>
              )}

              {/* Photo Index Indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                  {activeImageIdx + 1}/{images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative h-11 w-9 shrink-0 overflow-hidden rounded-md border transition ${
                      activeImageIdx === idx
                        ? 'border-foreground ring-1 ring-foreground'
                        : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveImageUrl(img.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Price */}
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground leading-snug">
                {detail.name}
              </h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-bold tabular-nums text-foreground">
                  {selectedVariant
                    ? formatCents(selectedVariant.priceCents)
                    : minPrice != null
                    ? formatCents(minPrice)
                    : '—'}
                </span>
                {selectedVariant?.compareAtPriceCents != null &&
                  selectedVariant.compareAtPriceCents >
                    selectedVariant.priceCents && (
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {formatCents(selectedVariant.compareAtPriceCents)}
                    </span>
                  )}
              </div>
            </div>

            {/* Short Description */}
            {detail.shortDescription && (
              <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-2 line-clamp-2">
                {detail.shortDescription}
              </p>
            )}

            {/* Interactive Variant Selector Pills */}
            {variants.length > 1 && (
              <div className="space-y-1.5 border-t border-border/40 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Phân loại</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {selectedVariant?.sku}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {variants.map((v) => {
                    const isSelected = v.id === selectedVariantId;
                    const label =
                      Object.values(v.attributes || {}).join(' - ') || v.sku;
                    const out = v.stock === 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        disabled={out}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          out
                            ? 'border border-border/60 text-muted-foreground line-through opacity-40'
                            : isSelected
                            ? 'border-2 border-foreground bg-foreground text-background font-semibold'
                            : 'border border-border bg-background text-foreground hover:border-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to Cart Button Mock */}
            <button
              type="button"
              disabled={!inStock || selectedVariant?.stock === 0}
              className="w-full flex items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>
                {!inStock || selectedVariant?.stock === 0
                  ? 'Hết hàng'
                  : `Thêm vào giỏ — ${formatCents(
                      selectedVariant?.priceCents ?? minPrice ?? 0,
                    )}`}
              </span>
            </button>
          </div>
        )}

        {/* TAB 3: GOOGLE SEARCH SNIPPET PREVIEW */}
        {tab === 'seo' && (
          <div className="rounded-xl border border-border bg-background p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-serif text-[11px] font-bold text-foreground">
                m
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[11px] font-medium text-foreground truncate">
                  myshop
                </p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">
                  https://myshop.example.com › products › {detail.slug}
                </p>
              </div>
            </div>

            <div className="pt-0.5">
              <h3 className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 leading-snug">
                {detail.name} | myshop
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {metaDesc}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <span>Độ dài mô tả:</span>
              <strong
                className={
                  metaDesc.length >= 120 && metaDesc.length <= 160
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }
              >
                {metaDesc.length}/160 ký tự
              </strong>
              <span>· Chuẩn Google SEO</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
