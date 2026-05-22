import { LOCAL_AUTH_TOKEN_KEY } from "@/lib/local-auth";
import { apiUrl } from "@/lib/api-url";

export type UploadedAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  format?: string;
};

export async function uploadAsset(file: File, folder?: string) {
  const body = new FormData();
  body.append("file", file);

  if (folder) {
    body.append("folder", folder);
  }

  const token = localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);
  const response = await fetch(apiUrl("/api/uploads"), {
    method: "POST",
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
        asset?: UploadedAsset;
      }
    | null;

  if (!response.ok || !payload?.asset) {
    throw new Error(payload?.error ?? "Unable to upload file.");
  }

  return payload.asset;
}
