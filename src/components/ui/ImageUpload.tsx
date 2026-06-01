"use client";

import {
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";

import { compressImageIfNeeded } from "@/lib/compressImage";
import {
  UploadImageError,
  uploadImage,
  uploadImageFromUrl,
} from "@/lib/uploadImage";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string, publicId: string) => void;
  onError?: (message: string) => void;
  folder?: string;
  uploadFolder?: string;
  accept?: string;
  maxSizeMB?: number;
  /** When true, shows an option to paste a remote image URL. Default: true */
  allowUrl?: boolean;
}

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

function isAcceptedImageFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return (
    acceptedImageTypes.has(file.type) ||
    acceptedImageExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isValidImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reusable authenticated image upload drop zone for RPG forms.
 *
 * @example
 * <ImageUpload
 *   value={form.watch("image_url")}
 *   onChange={(url, publicId) => {
 *     form.setValue("image_url", url);
 *     form.setValue("image_public_id", publicId);
 *   }}
 *   onError={(message) => toast.error(message)}
 *   folder="Bikes"
 *   maxSizeMB={5}
 * />
 */
export function ImageUpload({
  value,
  onChange,
  onError,
  folder = "General",
  uploadFolder = "rpg-system/general",
  accept = "image/*",
  maxSizeMB = 5,
  allowUrl = true,
}: ImageUploadProps) {
  const inputId = useId();
  const urlInputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function surfaceError(message: string): void {
    setErrorMessage(message);
    onError?.(message);
  }

  function replaceLocalPreview(file: File): void {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file || isUploading) return;

    const maxBytes = maxSizeMB * 1024 * 1024;

    if (!isAcceptedImageFile(file)) {
      surfaceError("Only JPG, PNG, and WebP images are accepted.");
      return;
    }

    const needsCompression = file.size > maxBytes;

    setErrorMessage(null);
    if (needsCompression) {
      setInfoMessage(
        `This image is ${formatFileSize(file.size)} (over the ${maxSizeMB}MB limit). We will automatically compress and resize it before uploading.`,
      );
    } else {
      setInfoMessage(null);
    }

    replaceLocalPreview(file);
    setIsUploading(true);

    try {
      let fileToUpload = file;

      if (needsCompression) {
        setIsCompressing(true);
        setInfoMessage("Compressing and resizing your image…");
        const compressed = await compressImageIfNeeded(file, { maxBytes });
        fileToUpload = compressed.file;
        setInfoMessage(
          `Optimized from ${formatFileSize(compressed.originalSize)} to ${formatFileSize(compressed.finalSize)} (${compressed.originalWidth}×${compressed.originalHeight} → ${compressed.finalWidth}×${compressed.finalHeight}).`,
        );
      }

      const uploaded = await uploadImage(fileToUpload, uploadFolder);
      onChange(uploaded.url, uploaded.public_id);
      setPreviewUrl(uploaded.url);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } catch (error) {
      const message =
        error instanceof UploadImageError
          ? error.message
          : "Network error. Please check your connection and try again.";
      surfaceError(message);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files.item(0) ?? undefined);
  }

  async function handleImageUrl(): Promise<void> {
    const trimmedUrl = imageUrlInput.trim();
    if (!trimmedUrl || isUploading) return;

    if (!isValidImageUrl(trimmedUrl)) {
      surfaceError("Enter a valid image URL starting with http:// or https://");
      return;
    }

    setErrorMessage(null);
    setPreviewUrl(trimmedUrl);
    setIsUploading(true);

    try {
      const uploaded = await uploadImageFromUrl(trimmedUrl, uploadFolder);
      onChange(uploaded.url, uploaded.public_id);
      setPreviewUrl(uploaded.url);
      setImageUrlInput("");
    } catch (error) {
      const message =
        error instanceof UploadImageError
          ? error.message
          : "Network error. Please check your connection and try again.";
      surfaceError(message);
      setPreviewUrl(value);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "group relative flex min-h-56 cursor-pointer overflow-hidden rounded-[1.5rem] border border-dashed p-5 transition-all duration-200",
          "bg-surface-container-low hover:bg-surface-container shadow-ambient",
          isDragging
            ? "border-primary ring-4 ring-primary/20 bg-primary/5"
            : "border-outline-variant/25 hover:border-primary/50",
          errorMessage ? "border-error/70 ring-4 ring-error/15 bg-error/5" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            void handleFile(event.target.files?.item(0) ?? undefined);
          }}
        />

        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          </>
        ) : null}

        <div className="relative z-10 flex w-full flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase backdrop-blur shadow-sm ${
                previewUrl
                  ? "border-white/20 bg-black/40 text-white"
                  : "border-outline-variant/20 bg-surface text-on-surface-variant"
              }`}
            >
              <PhotoIcon className="h-4 w-4" aria-hidden="true" />
              {folder}
            </div>
            {previewUrl ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition-all hover:bg-error hover:border-error shadow-sm"
                aria-label="Clear selected preview"
                onClick={(event) => {
                  event.preventDefault();
                  setPreviewUrl(value);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div>
            <div
              className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:-translate-y-1 ${
                previewUrl
                  ? "bg-white/20 text-white backdrop-blur border border-white/10"
                  : "bg-primary text-on-primary shadow-primary/25"
              }`}
            >
              {isUploading ? (
                <span
                  className={`h-5 w-5 animate-spin rounded-full border-2 ${
                    previewUrl
                      ? "border-white/40 border-t-white"
                      : "border-on-primary/40 border-t-on-primary"
                  }`}
                  aria-hidden="true"
                />
              ) : (
                <ArrowUpTrayIcon className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <p
              className={`text-lg font-bold ${
                previewUrl
                  ? "text-white shadow-black/50 drop-shadow-sm"
                  : "text-on-surface"
              }`}
            >
              {isCompressing
                ? "Compressing image"
                : isUploading
                  ? "Uploading image"
                  : previewUrl
                    ? "Change image"
                    : "Drop image or browse"}
            </p>
            <p
              className={`mt-1 max-w-md text-sm leading-6 ${
                previewUrl
                  ? "text-white/80 shadow-black/50 drop-shadow-sm"
                  : "text-on-surface-variant"
              }`}
            >
              JPG, PNG, or WebP. Target size {maxSizeMB}MB — larger files are
              automatically compressed and resized before upload.
              {allowUrl ? " Or paste an image URL below." : ""}
            </p>
          </div>
        </div>
      </label>

      {allowUrl ? (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-ambient">
          <label htmlFor={urlInputId} className="label-caps mb-2 block text-on-surface">
            Image URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id={urlInputId}
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://example.com/photo.jpg"
              value={imageUrlInput}
              disabled={isUploading}
              onChange={(event) => setImageUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleImageUrl();
                }
              }}
              className="w-full flex-1 rounded-xl border border-outline-variant/25 bg-surface px-4 py-2.5 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary"
            />
            <button
              type="button"
              disabled={isUploading || !imageUrlInput.trim()}
              onClick={() => void handleImageUrl()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Importing…" : "Use URL"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
            The image is imported to Cloudinary so it works the same as an upload.
          </p>
        </div>
      ) : null}

      {infoMessage ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-on-surface"
        >
          <InformationCircleIcon
            className="mt-0.5 h-4 w-4 flex-none text-primary"
            aria-hidden="true"
          />
          <span>{infoMessage}</span>
        </p>
      ) : null}

      {errorMessage ? (
        <p className="flex items-start gap-2 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          <ExclamationTriangleIcon
            className="mt-0.5 h-4 w-4 flex-none"
            aria-hidden="true"
          />
          <span>{errorMessage}</span>
        </p>
      ) : null}
    </div>
  );
}

export type { ImageUploadProps };
