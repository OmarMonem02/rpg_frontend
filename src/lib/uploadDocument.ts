import { getAuthToken } from "@/lib/auth-session";

export type UploadedDocument = {
  url: string;
  public_id: string;
  filename: string;
  mime_type: string;
};

type UploadErrorPayload = {
  error?: string;
  message?: string;
};

export class UploadDocumentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadDocumentError";
    this.status = status;
  }
}

async function parseUploadError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as UploadErrorPayload;
    return (
      payload.error ||
      payload.message ||
      "Document upload failed. Please try again."
    );
  } catch {
    return "Document upload failed. Please try again.";
  }
}

export async function uploadDocument(
  file: File,
  folder = "rpg-system/assets",
): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("folder", folder);
  const token = getAuthToken();

  const response = await fetch("/api/upload-document", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new UploadDocumentError(
      await parseUploadError(response),
      response.status,
    );
  }

  return (await response.json()) as UploadedDocument;
}
