"use client";

import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

type ImageGalleryModalProps = {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
};

export function ImageGalleryModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Item photo",
}: ImageGalleryModalProps) {
  const titleId = useId();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const bounded =
      images.length === 0
        ? 0
        : Math.min(Math.max(initialIndex, 0), images.length - 1);
    setCurrentIndex(bounded);
    setFailedUrls(new Set());
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || portalTarget === null || images.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), images.length - 1);
  const currentImage = images[safeIndex];
  const currentImageFailed = failedUrls.has(currentImage);

  return createPortal(
    <div
      className="form-modal-overlay fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="sr-only">
          Image gallery
        </p>

        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 right-0 z-10 rounded-full bg-surface/90 p-2 text-on-surface shadow-md transition-colors hover:bg-surface"
          aria-label="Close gallery"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-2xl">
          {currentImageFailed ? (
            <div className="flex min-h-[min(40vh,360px)] flex-col items-center justify-center gap-2 bg-surface-container-low px-6 py-12 text-center">
              <p className="text-sm font-medium text-on-surface">
                Image unavailable
              </p>
              <p className="max-w-sm text-xs text-on-surface-variant">
                This photo could not be loaded. The source may block external
                embedding.
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage}
              alt={alt}
              className="mx-auto max-h-[min(80vh,720px)] w-full object-contain bg-surface-container-low"
              onError={() => {
                setFailedUrls((prev) => {
                  const next = new Set(prev);
                  next.add(currentImage);
                  return next;
                });
              }}
            />
          )}
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface/95 p-2 text-on-surface shadow-lg transition-colors hover:bg-surface"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => (prev + 1) % images.length)
              }
              className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-surface/95 p-2 text-on-surface shadow-lg transition-colors hover:bg-surface"
              aria-label="Next image"
            >
              <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={[
                    "h-2.5 w-2.5 rounded-full transition-colors",
                    index === safeIndex ? "bg-primary" : "bg-on-surface-variant/40",
                  ].join(" ")}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>,
    portalTarget,
  );
}
