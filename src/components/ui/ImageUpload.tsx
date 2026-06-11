"use client";

import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
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

function isValidImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ImageUpload({
  value,
  onChange,
  onError,
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
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setStatus(null);
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

    setErrorMessage(null);
    replaceLocalPreview(file);
    setIsUploading(true);

    try {
      let fileToUpload = file;

      if (file.size > maxBytes) {
        setStatus("Compressing…");
        const compressed = await compressImageIfNeeded(file, { maxBytes });
        fileToUpload = compressed.file;
      }

      setStatus("Uploading…");
      const uploaded = await uploadImage(fileToUpload, uploadFolder);
      onChange(uploaded.url, uploaded.public_id);
      setPreviewUrl(uploaded.url);
      setStatus(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } catch (error) {
      const message =
        error instanceof UploadImageError
          ? error.message
          : "Upload failed. Check your connection and try again.";
      surfaceError(message);
    } finally {
      setIsUploading(false);
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
      surfaceError("Enter a valid http:// or https:// image URL.");
      return;
    }

    setErrorMessage(null);
    setPreviewUrl(trimmedUrl);
    setIsUploading(true);
    setStatus("Importing…");

    try {
      const uploaded = await uploadImageFromUrl(trimmedUrl, uploadFolder);
      onChange(uploaded.url, uploaded.public_id);
      setPreviewUrl(uploaded.url);
      setImageUrlInput("");
      setStatus(null);
    } catch (error) {
      const message =
        error instanceof UploadImageError
          ? error.message
          : "Import failed. Check your connection and try again.";
      surfaceError(message);
      setPreviewUrl(value);
    } finally {
      setIsUploading(false);
    }
  }

  const labelText = isUploading
    ? status ?? "Working…"
    : previewUrl
      ? "Change image"
      : "Choose or drop image";

  return (
    <div className="space-y-2">
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
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-outline-variant/25 hover:border-outline-variant/50",
          errorMessage ? "border-error/60" : "",
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

        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <PhotoIcon className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-on-surface">{labelText}</p>
          <p className="text-xs text-on-surface-variant">
            JPG, PNG, WebP · {maxSizeMB}MB max
            {allowUrl ? " · or paste URL below" : ""}
          </p>
        </div>

        {previewUrl && !isUploading ? (
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-on-surface-variant hover:bg-surface-container hover:text-error"
            aria-label="Clear preview"
            onClick={(event) => {
              event.preventDefault();
              setPreviewUrl(value);
              setErrorMessage(null);
              setStatus(null);
            }}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      {allowUrl ? (
        <div className="flex gap-2">
          <input
            id={urlInputId}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={imageUrlInput}
            disabled={isUploading}
            onChange={(event) => setImageUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleImageUrl();
              }
            }}
            className="form-input-base min-w-0 flex-1 py-2 text-sm"
          />
          <button
            type="button"
            disabled={isUploading || !imageUrlInput.trim()}
            onClick={() => void handleImageUrl()}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            Use URL
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-xs text-error">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export type { ImageUploadProps };
