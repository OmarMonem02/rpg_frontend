export type CompressImageOptions = {
  maxBytes: number;
  /** Longest edge in pixels after resize. Default 2048 */
  maxDimension?: number;
  /** Lowest JPEG/WebP quality to try. Default 0.5 */
  minQuality?: number;
  /** Starting quality. Default 0.92 */
  initialQuality?: number;
};

export type CompressImageResult = {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
  originalWidth: number;
  originalHeight: number;
  finalWidth: number;
  finalHeight: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image for compression."));
    };
    img.src = url;
  });
}

function getOutputMimeType(file: File): string {
  if (file.type === "image/webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function scaleDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }
  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Failed to compress image."));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Returns the original file when already under maxBytes; otherwise compresses
 * and resizes using canvas until the result fits the limit (when possible).
 */
export async function compressImageIfNeeded(
  file: File,
  options: CompressImageOptions,
): Promise<CompressImageResult> {
  const {
    maxBytes,
    maxDimension = 2048,
    minQuality = 0.5,
    initialQuality = 0.92,
  } = options;

  const img = await loadImageFromFile(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  if (file.size <= maxBytes) {
    return {
      file,
      wasCompressed: false,
      originalSize: file.size,
      finalSize: file.size,
      originalWidth,
      originalHeight,
      finalWidth: originalWidth,
      finalHeight: originalHeight,
    };
  }

  const mimeType = getOutputMimeType(file);
  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

  let { width, height } = scaleDimensions(
    originalWidth,
    originalHeight,
    maxDimension,
  );

  let quality = initialQuality;
  let blob: Blob | null = null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image compression is not supported in this browser.");
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    blob = await canvasToBlob(canvas, mimeType, quality);

    if (blob.size <= maxBytes) {
      break;
    }

    if (quality > minQuality + 0.05) {
      quality = Math.max(minQuality, quality - 0.1);
      continue;
    }

    const nextWidth = Math.round(width * 0.85);
    const nextHeight = Math.round(height * 0.85);
    if (nextWidth < 320 || nextHeight < 320) {
      break;
    }

    width = nextWidth;
    height = nextHeight;
    quality = initialQuality;
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error(
      `Could not compress this image below ${(maxBytes / (1024 * 1024)).toFixed(0)}MB. Try a smaller file.`,
    );
  }

  const compressedFile = new File([blob], `${baseName}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    wasCompressed: true,
    originalSize: file.size,
    finalSize: compressedFile.size,
    originalWidth,
    originalHeight,
    finalWidth: width,
    finalHeight: height,
  };
}
