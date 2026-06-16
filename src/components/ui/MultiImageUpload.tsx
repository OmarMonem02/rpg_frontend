"use client";

import {
  PhotoIcon,
  PlusIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { ImageGalleryModal } from "@/components/inventory/ImageGalleryModal";
import { ImageHoverPreview } from "@/components/inventory/ImageHoverPreview";
import { compressImageIfNeeded } from "@/lib/compressImage";
import {
  ensurePrimaryInventoryImages,
  MAX_INVENTORY_IMAGES,
  type InventoryImageRecord,
} from "@/lib/inventory-images";
import {
  UploadImageError,
  uploadImage,
  uploadImageFromUrl,
} from "@/lib/uploadImage";

type DraftImage = InventoryImageRecord & {
  localId: string;
  pendingFile?: File;
  pendingUrl?: string;
};

export type MultiImageUploadHandle = {
  uploadIfPending: () => Promise<InventoryImageRecord[]>;
  hasPendingUpload: () => boolean;
};

type MultiImageUploadProps = {
  value?: InventoryImageRecord[];
  onChange: (images: InventoryImageRecord[]) => void;
  onError?: (message: string) => void;
  uploadFolder?: string;
  maxImages?: number;
  allowUrl?: boolean;
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

function createLocalId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDraftImages(images: InventoryImageRecord[]): DraftImage[] {
  return ensurePrimaryInventoryImages(images).map((image, index) => ({
    ...image,
    localId: createLocalId(),
    sort_order: image.sort_order ?? index,
  }));
}

function toPayloadImages(images: DraftImage[]): InventoryImageRecord[] {
  return ensurePrimaryInventoryImages(
    images.map((image, index) => ({
      url: image.url,
      public_id: image.public_id,
      is_primary: image.is_primary,
      sort_order: image.sort_order ?? index,
    })),
  );
}

export const MultiImageUpload = forwardRef<
  MultiImageUploadHandle,
  MultiImageUploadProps
>(function MultiImageUpload(
  {
    value = [],
    onChange,
    onError,
    uploadFolder = "rpg-system/general",
    maxImages = MAX_INVENTORY_IMAGES,
    allowUrl = true,
  },
  ref,
) {
  const inputId = useId();
  const urlInputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const [images, setImages] = useState<DraftImage[]>(() => toDraftImages(value));
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    const hasPending = images.some(
      (image) => image.pendingFile || image.pendingUrl,
    );
    if (!hasPending) {
      setImages(toDraftImages(value));
    }
  }, [value]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function surfaceError(message: string): void {
    setErrorMessage(message);
    setStatus(null);
    onError?.(message);
  }

  function emitChange(nextImages: DraftImage[]): void {
    setImages(nextImages);
    onChange(toPayloadImages(nextImages));
  }

  function setPrimary(localId: string): void {
    emitChange(
      images.map((image) => ({
        ...image,
        is_primary: image.localId === localId,
      })),
    );
  }

  function removeImage(localId: string): void {
    const objectUrl = objectUrlsRef.current.get(localId);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrlsRef.current.delete(localId);
    }

    let next = images.filter((image) => image.localId !== localId);
    if (next.length > 0 && !next.some((image) => image.is_primary)) {
      next = next.map((image, index) => ({
        ...image,
        is_primary: index === 0,
      }));
    }
    emitChange(next);
  }

  async function prepareFile(file: File): Promise<File> {
    const maxBytes = 5 * 1024 * 1024;
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

  async function addFile(file: File | undefined): Promise<void> {
    if (!file || isUploading || images.length >= maxImages) return;

    if (!isAcceptedImageFile(file)) {
      surfaceError("Only JPG, PNG, and WebP images are accepted.");
      return;
    }

    setErrorMessage(null);

    try {
      const fileToUpload = await prepareFile(file);
      const localId = createLocalId();
      const objectUrl = URL.createObjectURL(fileToUpload);
      objectUrlsRef.current.set(localId, objectUrl);

      const next: DraftImage[] = [
        ...images,
        {
          localId,
          url: objectUrl,
          is_primary: images.length === 0,
          sort_order: images.length,
          pendingFile: fileToUpload,
        },
      ];

      emitChange(next);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch {
      // prepareFile already surfaced errors when needed.
    }
  }

  async function addImageUrl(): Promise<void> {
    const trimmedUrl = imageUrlInput.trim();
    if (!trimmedUrl || isUploading || images.length >= maxImages) return;

    if (!isValidImageUrl(trimmedUrl)) {
      surfaceError("Enter a valid http:// or https:// image URL.");
      return;
    }

    setErrorMessage(null);

    const localId = createLocalId();
    const next: DraftImage[] = [
      ...images,
      {
        localId,
        url: trimmedUrl,
        is_primary: images.length === 0,
        sort_order: images.length,
        pendingUrl: trimmedUrl,
      },
    ];

    emitChange(next);
    setImageUrlInput("");
  }

  async function uploadPendingImages(
    sourceImages: DraftImage[],
  ): Promise<InventoryImageRecord[]> {
    const uploaded: DraftImage[] = [];

    for (const image of sourceImages) {
      if (!image.pendingFile && !image.pendingUrl) {
        uploaded.push(image);
        continue;
      }

      try {
        const result = image.pendingFile
          ? await uploadImage(image.pendingFile, uploadFolder)
          : await uploadImageFromUrl(image.pendingUrl!, uploadFolder);

        const objectUrl = objectUrlsRef.current.get(image.localId);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrlsRef.current.delete(image.localId);
        }

        uploaded.push({
          ...image,
          url: result.url,
          public_id: result.public_id,
          pendingFile: undefined,
          pendingUrl: undefined,
        });
      } catch (error) {
        const message =
          error instanceof UploadImageError
            ? error.message
            : "Upload failed. Check your connection and try again.";
        surfaceError(message);
        throw error;
      }
    }

    return toPayloadImages(uploaded);
  }

  useImperativeHandle(ref, () => ({
    hasPendingUpload: () =>
      images.some((image) => image.pendingFile || image.pendingUrl),
    uploadIfPending: async () => {
      if (!images.some((image) => image.pendingFile || image.pendingUrl)) {
        return toPayloadImages(images);
      }

      setIsUploading(true);
      setStatus("Uploading…");
      setErrorMessage(null);

      try {
        const payload = await uploadPendingImages(images);
        const nextDraft = toDraftImages(payload);
        setImages(nextDraft);
        onChange(payload);
        setStatus(null);
        return payload;
      } finally {
        setIsUploading(false);
      }
    },
  }));

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDragging(false);
    void addFile(event.dataTransfer.files.item(0) ?? undefined);
  }

  const galleryUrls = images.map((image) => image.url);
  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.localId}
            className="group relative overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low"
          >
            <ImageHoverPreview src={image.url} alt="">
              <button
                type="button"
                className="block h-28 w-full"
                onClick={() => {
                  setGalleryIndex(index);
                  setGalleryOpen(true);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
            </ImageHoverPreview>

            <button
              type="button"
              onClick={() => setPrimary(image.localId)}
              className="absolute left-2 top-2 rounded-full bg-surface/90 p-1 shadow-sm transition-colors hover:bg-surface"
              aria-label={
                image.is_primary ? "Primary image" : "Set as primary image"
              }
            >
              {image.is_primary ? (
                <StarIconSolid className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <StarIcon className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => removeImage(image.localId)}
              className="absolute right-2 top-2 rounded-full bg-surface/90 p-1 text-on-surface-variant shadow-sm transition-colors hover:bg-surface hover:text-error"
              aria-label="Remove image"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            {image.pendingFile || image.pendingUrl ? (
              <span className="absolute bottom-2 left-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-on-primary">
                Pending
              </span>
            ) : null}
          </div>
        ))}

        {canAddMore ? (
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
              "flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-outline-variant/25 hover:border-outline-variant/50",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isUploading}
              onChange={(event) => {
                void addFile(event.target.files?.item(0) ?? undefined);
              }}
            />
            <PlusIcon className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
            <span className="text-xs font-medium text-on-surface-variant">
              Add photo
            </span>
          </label>
        ) : null}
      </div>

      {allowUrl && canAddMore ? (
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
                void addImageUrl();
              }
            }}
            className="form-input-base min-w-0 flex-1 py-2 text-sm"
          />
          <button
            type="button"
            disabled={isUploading || !imageUrlInput.trim()}
            onClick={() => void addImageUrl()}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            Use URL
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <PhotoIcon className="h-4 w-4" aria-hidden="true" />
        <span>
          {images.length}/{maxImages} photos · click star for primary · hover to
          preview · click to browse
        </span>
      </div>

      {images.length >= maxImages ? (
        <p className="text-xs text-on-surface-variant">
          Maximum {maxImages} photos per item.
        </p>
      ) : null}

      {isUploading ? (
        <p className="text-xs text-on-surface-variant">{status ?? "Working…"}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-xs text-error">{errorMessage}</p>
      ) : null}

      <ImageGalleryModal
        images={galleryUrls}
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
});
