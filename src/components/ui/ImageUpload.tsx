"use client";

import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { compressImageIfNeeded } from "@/lib/compressImage";
import {
  UploadImageError,
  uploadImage,
  uploadImageFromUrl,
  type UploadedImage,
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
  /** When true, uploads only when uploadIfPending() is called (e.g. on form submit). Default: true */
  deferUpload?: boolean;
}

type ImageUploadHandle = {
  uploadIfPending: () => Promise<UploadedImage | null>;
  hasPendingUpload: () => boolean;
};

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

export const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(
  function ImageUpload(
    {
      value,
      onChange,
      onError,
      uploadFolder = "rpg-system/general",
      accept = "image/*",
      maxSizeMB = 5,
      allowUrl = true,
      deferUpload = true,
    },
    ref,
  ) {
    const inputId = useId();
    const urlInputId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const pendingFileRef = useRef<File | null>(null);
    const pendingUrlRef = useRef<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [hasPendingSelection, setHasPendingSelection] = useState(false);

    useEffect(() => {
      if (!hasPendingSelection) {
        setPreviewUrl(value);
      }
    }, [value, hasPendingSelection]);

    useEffect(() => {
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
      };
    }, []);

    function clearPendingSelection(): void {
      pendingFileRef.current = null;
      pendingUrlRef.current = null;
      setHasPendingSelection(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }

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

    async function prepareFile(file: File): Promise<File> {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size <= maxBytes) return file;

      setStatus("Compressing…");
      setIsUploading(true);
      try {
        const compressed = await compressImageIfNeeded(file, { maxBytes });
        return compressed.file;
      } finally {
        setIsUploading(false);
        setStatus(null);
      }
    }

    async function uploadPreparedFile(file: File): Promise<UploadedImage> {
      setIsUploading(true);
      setStatus("Uploading…");
      try {
        const uploaded = await uploadImage(file, uploadFolder);
        onChange(uploaded.url, uploaded.public_id);
        setPreviewUrl(uploaded.url);
        clearPendingSelection();
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        return uploaded;
      } catch (error) {
        const message =
          error instanceof UploadImageError
            ? error.message
            : "Upload failed. Check your connection and try again.";
        surfaceError(message);
        throw error;
      } finally {
        setIsUploading(false);
        setStatus(null);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    }

    async function handleFile(file: File | undefined): Promise<void> {
      if (!file || isUploading) return;

      if (!isAcceptedImageFile(file)) {
        surfaceError("Only JPG, PNG, and WebP images are accepted.");
        return;
      }

      setErrorMessage(null);

      try {
        const fileToUpload = await prepareFile(file);

        if (deferUpload) {
          pendingFileRef.current = fileToUpload;
          pendingUrlRef.current = null;
          setHasPendingSelection(true);
          replaceLocalPreview(fileToUpload);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
          return;
        }

        replaceLocalPreview(fileToUpload);
        await uploadPreparedFile(fileToUpload);
      } catch {
        // prepareFile or uploadPreparedFile already surfaced the error.
      }
    }

    async function handleImageUrl(): Promise<void> {
      const trimmedUrl = imageUrlInput.trim();
      if (!trimmedUrl || isUploading) return;

      if (!isValidImageUrl(trimmedUrl)) {
        surfaceError("Enter a valid http:// or https:// image URL.");
        return;
      }

      setErrorMessage(null);

      if (deferUpload) {
        pendingUrlRef.current = trimmedUrl;
        pendingFileRef.current = null;
        setHasPendingSelection(true);
        setPreviewUrl(trimmedUrl);
        setImageUrlInput("");
        return;
      }

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

    useImperativeHandle(ref, () => ({
      hasPendingUpload: () =>
        pendingFileRef.current !== null || pendingUrlRef.current !== null,
      uploadIfPending: async () => {
        if (!pendingFileRef.current && !pendingUrlRef.current) {
          return null;
        }

        setIsUploading(true);
        setStatus("Uploading…");
        setErrorMessage(null);

        try {
          let uploaded: UploadedImage;
          if (pendingFileRef.current) {
            uploaded = await uploadImage(pendingFileRef.current, uploadFolder);
          } else {
            uploaded = await uploadImageFromUrl(
              pendingUrlRef.current!,
              uploadFolder,
            );
          }

          onChange(uploaded.url, uploaded.public_id);
          setPreviewUrl(uploaded.url);
          clearPendingSelection();
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          setStatus(null);
          return uploaded;
        } catch (error) {
          const message =
            error instanceof UploadImageError
              ? error.message
              : "Upload failed. Check your connection and try again.";
          surfaceError(message);
          throw error;
        } finally {
          setIsUploading(false);
        }
      },
    }));

    function handleDrop(event: DragEvent<HTMLLabelElement>): void {
      event.preventDefault();
      setIsDragging(false);
      void handleFile(event.dataTransfer.files.item(0) ?? undefined);
    }

    const labelText = isUploading
      ? status ?? "Working…"
      : hasPendingSelection
        ? "Image ready — uploads on save"
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
                const hadPending = hasPendingSelection;
                clearPendingSelection();
                setErrorMessage(null);
                setStatus(null);
                if (hadPending) {
                  setPreviewUrl(value);
                  return;
                }
                setPreviewUrl(undefined);
                onChange("", "");
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
  },
);

export type { ImageUploadHandle, ImageUploadProps };
