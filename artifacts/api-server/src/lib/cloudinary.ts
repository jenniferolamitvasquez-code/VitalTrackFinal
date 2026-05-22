import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";

let configured = false;

export type UploadedAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  format?: string;
};

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function uploadBufferToCloudinary(input: {
  buffer: Buffer;
  folder?: string;
}): Promise<UploadedAsset> {
  ensureCloudinaryConfigured();

  const result = await new Promise<UploadedAsset>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: buildFolder(input.folder),
        resource_type: "auto",
      },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          assetId: response.asset_id,
          publicId: response.public_id,
          secureUrl: response.secure_url,
          resourceType: response.resource_type,
          bytes: response.bytes,
          format: response.format,
        });
      },
    );

    Readable.from(input.buffer).pipe(uploadStream);
  });

  return result;
}

function ensureCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

function buildFolder(folder?: string): string | undefined {
  const rootFolder = sanitizeFolder(process.env.CLOUDINARY_FOLDER);
  const requestedFolder = sanitizeFolder(folder);

  if (rootFolder && requestedFolder) {
    return `${rootFolder}/${requestedFolder}`;
  }

  return rootFolder ?? requestedFolder;
}

function sanitizeFolder(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");

  return cleaned || undefined;
}

