"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ImageHoverPreviewProps = {
  src: string;
  alt?: string;
  children: ReactNode;
  previewSize?: number;
};

type PreviewPosition = {
  top: number;
  left: number;
};

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

function computePreviewPosition(
  rect: DOMRect,
  previewSize: number,
  margin = 12,
): PreviewPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const placements: PreviewPosition[] = [
    {
      left: rect.right + margin,
      top: rect.top + rect.height / 2 - previewSize / 2,
    },
    {
      left: rect.left - previewSize - margin,
      top: rect.top + rect.height / 2 - previewSize / 2,
    },
    {
      left: rect.left + rect.width / 2 - previewSize / 2,
      top: rect.bottom + margin,
    },
    {
      left: rect.left + rect.width / 2 - previewSize / 2,
      top: rect.top - previewSize - margin,
    },
  ];

  const fits = (pos: PreviewPosition) =>
    pos.left >= margin &&
    pos.top >= margin &&
    pos.left + previewSize <= viewportWidth - margin &&
    pos.top + previewSize <= viewportHeight - margin;

  const chosen = placements.find(fits) ?? placements[0]!;

  return {
    left: Math.min(
      Math.max(chosen.left, margin),
      viewportWidth - previewSize - margin,
    ),
    top: Math.min(
      Math.max(chosen.top, margin),
      viewportHeight - previewSize - margin,
    ),
  };
}

export function ImageHoverPreview({
  src,
  alt = "",
  children,
  previewSize = 240,
}: ImageHoverPreviewProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [position, setPosition] = useState<PreviewPosition>({ top: 0, left: 0 });
  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return null;

    const next = computePreviewPosition(
      anchor.getBoundingClientRect(),
      previewSize,
    );
    setPosition(next);
    return next;
  }, [previewSize]);

  const showPreview = useCallback(() => {
    clearHideTimer();
    const anchor = anchorRef.current;
    if (!anchor) return;

    const next = computePreviewPosition(
      anchor.getBoundingClientRect(),
      previewSize,
    );
    setPosition(next);
    setVisible(true);
  }, [clearHideTimer, previewSize]);

  const hidePreview = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 80);
  }, [clearHideTimer]);

  useEffect(() => {
    setPreviewFailed(false);
  }, [src]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition]);

  useEffect(() => {
    if (!visible) return;

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, updatePosition]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const preview =
    visible && portalTarget && !previewFailed ? (
      <div
        className="pointer-events-none fixed z-[110] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
          width: previewSize,
          height: previewSize,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setPreviewFailed(true)}
        />
      </div>
    ) : null;

  return (
    <>
      <div
        ref={anchorRef}
        className="relative inline-flex"
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
      >
        {children}
      </div>

      {preview && portalTarget ? createPortal(preview, portalTarget) : null}
    </>
  );
}
