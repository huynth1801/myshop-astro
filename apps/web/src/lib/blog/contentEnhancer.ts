export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface EnhancedPostContent {
  enhancedHtml: string;
  toc: TocItem[];
  readingTimeMinutes: number;
  wordCount: number;
}

/**
 * Normalizes Vietnamese string to standard NFC form to eliminate composed/decomposed accent mismatches.
 */
function normalizeText(str: string): string {
  return (str || '').normalize('NFC');
}

/**
 * Generates a clean URL slug from heading text, handling Vietnamese accents.
 */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for clean URLs
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'muc';
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

// Start tags that implicitly close an open <p> (HTML5 "in body" rules).
const P_CLOSING_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hgroup', 'main', 'menu', 'nav', 'ol', 'p',
  'pre', 'section', 'table', 'ul',
]);

/**
 * Appends the missing end tags for containers left open by malformed crawler HTML.
 * Without this, an unclosed <div> in stored content swallows the page sections that
 * follow the article body (share bar, related products) into the .prose wrapper,
 * which then applies editorial typography to product cards. Stray end tags with no
 * matching opener are dropped, mirroring how browsers discard them.
 */
function repairUnbalancedTags(html: string): string {
  // Scan a copy without comments/script/style so their contents cannot produce
  // bogus tag tokens; the closers computed from the scan are appended to the
  // original markup.
  const scanTarget = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const stack: string[] = [];
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let match: RegExpExecArray | null;

  const closeOpen = (tag: string) => {
    const idx = stack.lastIndexOf(tag);
    if (idx !== -1) stack.length = idx;
  };

  while ((match = tagPattern.exec(scanTarget)) !== null) {
    const isEnd = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (VOID_TAGS.has(tag)) continue;

    if (isEnd) {
      if (stack[stack.length - 1] === tag) {
        stack.pop();
      } else if (stack.includes(tag)) {
        closeOpen(tag);
      }
      continue;
    }

    // Implicit closes, mirroring the HTML5 tree builder for common cases.
    if (tag === 'p') {
      closeOpen('p');
    } else if (P_CLOSING_TAGS.has(tag)) {
      closeOpen('p');
    }
    if (tag === 'li') {
      closeOpen('li');
    }
    if (/^h[1-6]$/.test(tag)) {
      const top = stack[stack.length - 1];
      if (top && /^h[1-6]$/.test(top)) stack.pop();
    }
    if (tag === 'td' || tag === 'th') {
      closeOpen('td');
      closeOpen('th');
    }
    if (tag === 'tr') {
      closeOpen('tr');
      closeOpen('td');
      closeOpen('th');
    }

    stack.push(tag);
  }

  if (stack.length === 0) return html;
  return html + stack.reverse().map((tag) => `</${tag}>`).join('');
}

/**
 * Enhances raw blog HTML with modern editorial typography, interactive TOC headings,
 * verified expert disclaimers, recommendation cards, and responsive media embeds.
 */
export function enhanceBlogContent(rawHtml: string): EnhancedPostContent {
  if (!rawHtml) {
    return {
      enhancedHtml: '',
      toc: [],
      readingTimeMinutes: 1,
      wordCount: 0,
    };
  }

  let html = normalizeText(rawHtml);

  // 1. Remove broken crawler TOC stubs (e.g. orphan ☰ Mục lục with empty containers).
  //    The crawler emits three opening <div>s but only closes two of them; the first
  //    pattern targets that exact unterminated shape, the rest are fallbacks.
  html = html.replace(
    /<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*<span[^>]*>[☰≡]<\/span>\s*<span[^>]*>Mục lục<\/span>\s*<\/div>\s*<div[^>]*><\/div>/gi,
    ''
  );
  html = html.replace(
    /<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*<span[^>]*>[☰≡]<\/span>\s*<span[^>]*>Mục lục<\/span>\s*<\/div>\s*<div[^>]*><\/div>\s*<\/div>\s*<\/div>/gi,
    ''
  );
  html = html.replace(
    /<div[^>]*>\s*<div[^>]*>\s*<span[^>]*>[☰≡]<\/span>\s*<span[^>]*>Mục lục<\/span>\s*<\/div>\s*<div[^>]*><\/div>/gi,
    ''
  );
  html = html.replace(
    /<div[^>]*>\s*<span[^>]*>[☰≡]<\/span>\s*<span[^>]*>Mục lục<\/span>\s*<\/div>/gi,
    ''
  );
  html = html.replace(/<p[^>]*>\s*[☰≡]\s*Mục lục\s*<\/p>/gi, '');

  // 2. Extract Headings and inject IDs for Table of Contents
  const toc: TocItem[] = [];
  const headingCounts: Record<string, number> = {};

  html = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag, _attrs, innerContent) => {
    const level = tag.toLowerCase() === 'h2' ? 2 : 3;
    const cleanText = innerContent.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) return '';

    let baseSlug = slugifyHeading(cleanText);
    headingCounts[baseSlug] = (headingCounts[baseSlug] || 0) + 1;
    const id = headingCounts[baseSlug] > 1 ? `${baseSlug}-${headingCounts[baseSlug]}` : baseSlug;

    toc.push({ id, text: cleanText, level });

    if (level === 2) {
      return `<h2 id="${id}" class="group scroll-mt-24 mt-12 mb-5 flex items-baseline justify-between border-b border-border/60 pb-3 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        <span>${cleanText}</span>
        <a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-normal text-muted-foreground hover:text-accent-olive ml-2 select-none" aria-label="Liên kết mục này" title="Sao chép liên kết">#</a>
      </h2>`;
    } else {
      return `<h3 id="${id}" class="group scroll-mt-24 mt-8 mb-3 flex items-baseline justify-between text-xl font-medium tracking-tight text-foreground">
        <span>${cleanText}</span>
        <a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-normal text-muted-foreground hover:text-accent-olive ml-2 select-none" aria-label="Liên kết mục này" title="Sao chép liên kết">#</a>
      </h3>`;
    }
  });

  // 3. Transform Expert & Medical consultation disclaimers into verified callout cards
  const disclaimerRegex = /<p[^>]*>(?:<b>|<strong>)?\s*(Bài viết được tham vấn chuyên môn[^<]+|Được tham vấn bởi[^<]+|Tham vấn y khoa:[^<]+)\s*(?:<\/b>|<\/strong>)?<\/p>/gi;
  html = html.replace(disclaimerRegex, (_match, disclaimerText) => {
    return `<div class="not-prose my-8 overflow-hidden rounded-2xl border border-accent-olive/25 bg-accent-olive/5 p-5 sm:p-6 shadow-xs">
      <div class="flex items-start gap-3.5">
        <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-olive/15 text-accent-olive">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent-olive">
              Tham vấn chuyên môn
            </span>
            <span class="inline-block h-1 w-1 rounded-full bg-accent-olive/40"></span>
            <span class="text-xs text-muted-foreground">Đã kiểm chứng y khoa</span>
          </div>
          <p class="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-foreground font-medium">
            ${disclaimerText.trim()}
          </p>
        </div>
      </div>
    </div>`;
  });

  // 4. Transform "Xem thêm:" / "Bài viết liên quan:" lists into recommendation card groups
  const xemThemRegex = /<p[^>]*>(?:<b>|<strong>)?\s*(?:Xem thêm|Bài viết liên quan|Đọc thêm):?\s*(?:<\/b>|<\/strong>)?<\/p>\s*<ul>([\s\S]*?)<\/ul>/gi;
  html = html.replace(xemThemRegex, (_match, itemsHtml) => {
    const linkRegex = /<a\s+href="([^"]+)"[^>]*>(?:<b>|<strong>)?([\s\S]*?)(?:<\/b>|<\/strong>)?<\/a>/gi;
    const links: Array<{ href: string; title: string }> = [];
    let lMatch;
    while ((lMatch = linkRegex.exec(itemsHtml)) !== null) {
      const cleanTitle = lMatch[2].replace(/<[^>]+>/g, '').trim();
      if (cleanTitle) {
        links.push({ href: lMatch[1], title: cleanTitle });
      }
    }

    if (links.length === 0) return '';

    const cardsHtml = links
      .map(
        (l) => `<a href="${l.href}" class="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-200 hover:border-accent-olive/40 hover:bg-muted/40 hover:shadow-xs">
          <span class="text-sm font-medium text-foreground transition-colors group-hover:text-accent-olive line-clamp-2">
            ${l.title}
          </span>
          <svg class="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent-olive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
        </a>`
      )
      .join('\n');

    return `<div class="not-prose my-10 rounded-2xl border border-border/80 bg-surface/50 p-5 sm:p-6 shadow-xs">
      <div class="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-olive">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span>Gợi ý đọc thêm cùng chủ đề</span>
      </div>
      <div class="grid gap-2.5">
        ${cardsHtml}
      </div>
    </div>`;
  });

  // 5. Transform YouTube thumbnail/video container into responsive embedded player
  const ytRegex = /<div[^>]*>\s*<a\s+href="[^"]*youtube\.com\/(?:embed\/|watch\?v=)([a-zA-Z0-9_-]{11})[^"]*"[^>]*>[\s\S]*?<a\s+[^>]*href="[^"]*youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"[^>]*><span>\s*([\s\S]*?)\s*<\/span><\/a>\s*<\/div>/gi;
  html = html.replace(ytRegex, (_match, id1, id2, title) => {
    const videoId = id1 || id2;
    const cleanTitle = (title || 'Video hướng dẫn').replace(/<[^>]+>/g, '').trim();
    return `<div class="not-prose my-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div class="relative aspect-video w-full bg-black">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          title="${cleanTitle}"
          class="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-border bg-surface/50 p-3.5 text-xs">
        <span class="font-medium text-foreground line-clamp-1">${cleanTitle}</span>
        <span class="shrink-0 text-muted-foreground flex items-center gap-1">Video tư vấn</span>
      </div>
    </div>`;
  });

  // 6. Unwrap heavy bold body paragraphs where the entire paragraph is <b>...</b>
  html = html.replace(/<p[^>]*>(?:<b>|<strong>)([^<]{45,})(?:<\/b>|<\/strong>)<\/p>/gi, '<p class="leading-relaxed">$1</p>');

  // 7. Guarantee balanced container tags so malformed content cannot swallow
  //    the page sections rendered after the article body.
  html = repairUnbalancedTags(html);

  // 8. Calculate word count and estimated reading time
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(' ').filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    enhancedHtml: html,
    toc,
    readingTimeMinutes,
    wordCount,
  };
}
