type CloudinaryParts = {
  cloudName: string;
  resourceType: "image" | "raw";
  publicId: string;
  version?: string;
};

function parseCloudinaryUrl(url: string): CloudinaryParts | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|raw)\/upload\/(?:s--[^/]+--\/)?(?:(v\d+)\/)?([^?#]+)/i,
  );

  if (!match) return null;

  const [, cloudName, resourceType, version, pathWithExt] = match;
  let publicId = pathWithExt;

  if (resourceType === "image" && publicId.toLowerCase().endsWith(".pdf")) {
    publicId = publicId.slice(0, -4);
  }

  return {
    cloudName,
    resourceType: resourceType as "image" | "raw",
    publicId,
    version,
  };
}

export function isPdfDocument(mimeType?: string, url?: string): boolean {
  return (
    mimeType === "application/pdf" ||
    Boolean(url && /\.pdf(?:\?|#|$)/i.test(url))
  );
}

export function isImageDocument(mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

function buildImagePdfUrl(parts: CloudinaryParts): string {
  const versionSegment = parts.version ? `${parts.version}/` : "";

  return `https://res.cloudinary.com/${parts.cloudName}/image/upload/${versionSegment}${parts.publicId}.pdf`;
}

function getPdfDeliveryUrl(url: string): string {
  if (/\.pdf(?:\?|#|$)/i.test(url)) {
    return url;
  }

  const parts = parseCloudinaryUrl(url);
  if (!parts) return url;

  if (parts.resourceType === "image") {
    return buildImagePdfUrl(parts);
  }

  return url;
}

/** Returns the delivery URL for inline preview (images as-is, PDFs as .pdf). */
export function getDocumentPreviewUrl(url: string, mimeType?: string): string {
  if (!url.trim()) return url;

  if (isImageDocument(mimeType)) {
    return url;
  }

  if (isPdfDocument(mimeType, url)) {
    return getPdfDeliveryUrl(url);
  }

  return url;
}

export function canPreviewPdfInline(url: string, mimeType?: string): boolean {
  if (!isPdfDocument(mimeType, url)) return false;

  const parts = parseCloudinaryUrl(url);
  return parts?.resourceType === "image";
}

/** Opens the best available view URL for a document. */
export function getDocumentViewUrl(url: string, mimeType?: string): string {
  return getDocumentPreviewUrl(url, mimeType);
}
