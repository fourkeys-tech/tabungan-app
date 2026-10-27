'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  showArrows?: boolean;
}

export function HorizontalScroller({
  children,
  className = '',
  wrapperClassName = '',
  showArrows = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll states
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftVal = useRef(0);
  const hasMoved = useRef(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    // Initial check after paint
    const timer = setTimeout(checkScroll, 100);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, children]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(160, el.clientWidth * 0.6);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 300);
  };

  // Mouse Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only main left click
    const el = containerRef.current;
    if (!el) return;
    isDown.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftVal.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMoved.current = true;
      el.scrollLeft = scrollLeftVal.current - walk;
      checkScroll();
    }
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  // Intercept click if user was dragging so active item is not inadvertently changed
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMoved.current = false;
    }
  };

  return (
    <div className={`relative flex items-center max-w-full group ${wrapperClassName}`}>
      {/* Left Arrow Button */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount('left')}
          aria-label="Geser ke kiri"
          className="absolute -left-2.5 z-20 w-7 h-7 rounded-full bg-surface-container-lowest/95 text-on-surface shadow-md border border-surface-container-highest flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            chevron_left
          </span>
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
        className={`overflow-x-auto hide-scrollbar touch-pan-x cursor-grab active:cursor-grabbing select-none ${className}`}
      >
        {children}
      </div>

      {/* Right Arrow Button */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          aria-label="Geser ke kanan"
          className="absolute -right-2.5 z-20 w-7 h-7 rounded-full bg-surface-container-lowest/95 text-on-surface shadow-md border border-surface-container-highest flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            chevron_right
          </span>
        </button>
      )}
    </div>
  );
}

