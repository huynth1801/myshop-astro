import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { matchesLocationQuery, type LocationItem } from '../../lib/api/vn-locations';

interface SearchableSelectProps {
  id?: string;
  label?: string;
  placeholder: string;
  searchPlaceholder?: string;
  value: string;
  onChange: (value: string, item?: LocationItem) => void;
  items: LocationItem[];
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  allowCustom?: boolean;
  helperText?: string;
}

export function SearchableSelect({
  id: explicitId,
  label,
  placeholder,
  searchPlaceholder = 'Gõ để tìm kiếm…',
  value,
  onChange,
  items,
  loading = false,
  disabled = false,
  required = false,
  error,
  allowCustom = true,
  helperText,
}: SearchableSelectProps) {
  const autoId = useId();
  const id = explicitId || autoId;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter items based on query (diacritic-tolerant)
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((item) => matchesLocationQuery(item, query));
  }, [items, query]);

  // Selected item object if present in list
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find((item) => item.name === value || String(item.code) === value) || null;
  }, [items, value]);

  const displayValue = selectedItem ? selectedItem.name : value;

  function handleSelect(item: LocationItem) {
    onChange(item.name, item);
    setIsOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
  }

  function handleUseCustomQuery() {
    const trimmed = query.trim();
    if (trimmed) {
      onChange(trimmed);
      setIsOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
          }
        }}
        className={`mt-1.5 flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 text-left text-sm transition focus:outline-none focus:ring-1 focus:ring-foreground ${
          error ? 'border-destructive' : 'border-border'
        } ${disabled ? 'cursor-not-allowed opacity-50 bg-muted/40' : 'hover:border-foreground/60'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${displayValue ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {loading ? 'Đang tải dữ liệu…' : displayValue || placeholder}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {displayValue && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Xóa lựa chọn"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onChange('');
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 flex max-h-72 flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
          {/* Search Bar */}
          <div className="sticky top-0 z-10 border-b border-border/70 bg-popover p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md bg-muted/50 pl-8 pr-7 text-xs outline-none transition focus:bg-background focus:ring-1 focus:ring-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredItems.length === 1) {
                      handleSelect(filteredItems[0]);
                    } else if (allowCustom && query.trim() && filteredItems.length === 0) {
                      handleUseCustomQuery();
                    }
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto p-1 text-sm divide-y divide-border/20" role="listbox">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isSelected = item.name === value || String(item.code) === value;
                return (
                  <div
                    key={item.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      isSelected
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                <p>Không tìm thấy kết quả phù hợp cho &quot;{query}&quot;</p>
                {allowCustom && query.trim() && (
                  <button
                    type="button"
                    onClick={handleUseCustomQuery}
                    className="mt-2 inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Dùng &quot;{query.trim()}&quot;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
