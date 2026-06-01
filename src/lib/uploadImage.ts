import { getAuthToken } from "@/lib/auth-session";

export type UploadedImage = {
  url: string;
  public_id: string;
};

type UploadErrorPayload = {
  error?: string;
  message?: string;
};

export class UploadImageError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadImageError";
    this.status = status;
  }
}

function getUploadUrl(): string {
  // Always route image uploads through the Next.js API proxy to Cloudinary
  return "/api/upload-image";
}

async function parseUploadError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as UploadErrorPayload;
    return (
      payload.error ||
      payload.message ||
      "Image upload failed. Please try again."
    );
  } catch {
    return "Image upload failed. Please try again.";
  }
}

/**
 * Uploads an image file to the Laravel API and returns the Cloudinary URL and public id.
 */
export async function uploadImage(
  file: File,
  folder = "rpg-system/general",
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  const token = getAuthToken();

  const response = await fetch(getUploadUrl(), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new UploadImageError(
      await parseUploadError(response),
      response.status,
    );
  }

  return (await response.json()) as UploadedImage;
}

/**
 * Fetches a remote image URL via Cloudinary and returns the hosted URL and public id.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder = "rpg-system/general",
): Promise<UploadedImage> {
  const token = getAuthToken();

  const response = await fetch(getUploadUrl(), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageUrl, folder }),
  });

  if (!response.ok) {
    throw new UploadImageError(
      await parseUploadError(response),
      response.status,
    );
  }

  return (await response.json()) as UploadedImage;
}
