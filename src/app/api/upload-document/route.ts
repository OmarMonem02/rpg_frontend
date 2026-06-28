import { NextResponse } from "next/server";
import crypto from "crypto";

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function signUpload(folder: string, timestamp: string, apiSecret: string): string {
  const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash("sha1").update(strToSign).digest("hex");
}

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** PDFs must use the image API so Cloudinary can render pages for preview. */
function uploadResourceType(_mimeType: string): "image" {
  return "image";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("document");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { error: "A document file is required." },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Document exceeds the 10MB upload limit." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, JPEG, PNG, and WebP documents are allowed." },
        { status: 400 },
      );
    }

    const folderField = formData.get("folder");
    const folder =
      typeof folderField === "string" && folderField.trim()
        ? folderField.trim()
        : "rpg-system/assets";

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Server configuration error for document upload" },
        { status: 500 },
      );
    }

    const resourceType = uploadResourceType(file.type);
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const signature = signUpload(folder, timestamp, apiSecret);

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("folder", folder);
    cloudinaryFormData.append("timestamp", timestamp);
    cloudinaryFormData.append("api_key", apiKey);
    cloudinaryFormData.append("signature", signature);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: cloudinaryFormData,
      },
    );

    const cloudinaryData = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok) {
      return NextResponse.json(
        { error: cloudinaryData.error?.message || "Document upload failed" },
        { status: cloudinaryResponse.status },
      );
    }

    const secureUrl =
      typeof cloudinaryData.secure_url === "string"
        ? cloudinaryData.secure_url
        : "";

    return NextResponse.json({
      url: secureUrl,
      public_id: cloudinaryData.public_id,
      filename: file.name,
      mime_type: file.type,
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Internal Error processing document upload:", error);
    return NextResponse.json(
      { error: "Internal server error during document upload" },
      { status: 500 },
    );
  }
}
