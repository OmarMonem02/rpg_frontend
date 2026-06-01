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

function isValidRemoteImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadToCloudinary(
  file: File | string,
  folder: string,
  credentials: CloudinaryCredentials,
) {
  const { cloudName, apiKey, apiSecret } = credentials;
  const timestamp = Math.round(new Date().getTime() / 1000).toString();
  const signature = signUpload(folder, timestamp, apiSecret);

  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append("file", file);
  cloudinaryFormData.append("folder", folder);
  cloudinaryFormData.append("timestamp", timestamp);
  cloudinaryFormData.append("api_key", apiKey);
  cloudinaryFormData.append("signature", signature);

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: cloudinaryFormData,
    },
  );

  const cloudinaryData = await cloudinaryResponse.json();

  if (!cloudinaryResponse.ok) {
    console.error("Cloudinary API error:", cloudinaryData);
    return NextResponse.json(
      { error: cloudinaryData.error?.message || "Image upload failed" },
      { status: cloudinaryResponse.status },
    );
  }

  return NextResponse.json({
    url: cloudinaryData.secure_url,
    public_id: cloudinaryData.public_id,
  });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let file: File | null = null;
    let imageUrl: string | null = null;
    let folder = "rpg-system/general";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        imageUrl?: string;
        image_url?: string;
        folder?: string;
      };
      imageUrl = body.imageUrl ?? body.image_url ?? null;
      if (body.folder) {
        folder = body.folder;
      }
    } else {
      const formData = await request.formData();
      const formFile = formData.get("image");
      if (formFile instanceof File && formFile.size > 0) {
        file = formFile;
      }
      const urlField = formData.get("imageUrl") ?? formData.get("image_url");
      if (typeof urlField === "string" && urlField.trim()) {
        imageUrl = urlField.trim();
      }
      const folderField = formData.get("folder");
      if (typeof folderField === "string" && folderField.trim()) {
        folder = folderField.trim();
      }
    }

    if (!file && !imageUrl) {
      return NextResponse.json(
        { error: "Provide an image file or image URL" },
        { status: 400 },
      );
    }

    if (file && imageUrl) {
      return NextResponse.json(
        { error: "Provide either an image file or an image URL, not both" },
        { status: 400 },
      );
    }

    if (imageUrl && !isValidRemoteImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Image URL must be a valid http or https address" },
        { status: 400 },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary credentials missing in environment variables.");
      return NextResponse.json(
        { error: "Server configuration error for image upload" },
        { status: 500 },
      );
    }

    const credentials: CloudinaryCredentials = { cloudName, apiKey, apiSecret };
    const uploadSource = file ?? imageUrl!;

    return await uploadToCloudinary(uploadSource, folder, credentials);
  } catch (error) {
    console.error("Internal Error processing image upload:", error);
    return NextResponse.json(
      { error: "Internal server error during image upload" },
      { status: 500 },
    );
  }
}
