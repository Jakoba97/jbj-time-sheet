import { getDriveAuthClient } from "@/lib/google/driveAuth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveRequest<T>(
  url: string,
  options?: { method?: "GET" | "POST" | "PATCH"; headers?: Record<string, string>; data?: Buffer },
): Promise<T> {
  const client = getDriveAuthClient();
  const res = await client.request<T>({
    url,
    method: options?.method ?? "GET",
    headers: options?.headers,
    data: options?.data,
  });
  return res.data;
}

/** Finds a folder by exact name directly under `parentFolderId`, or null if none exists. */
export async function findFolderIdByName(
  parentFolderId: string,
  name: string,
): Promise<string | null> {
  const query = [
    `'${parentFolderId}' in parents`,
    `name = '${escapeQueryValue(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");

  const params = new URLSearchParams({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
  });

  const data = await driveRequest<{ files: { id: string; name: string }[] }>(
    `${DRIVE_API}/files?${params.toString()}`,
  );
  return data.files[0]?.id ?? null;
}

/** Finds a file by exact name directly under `parentFolderId`, or null if none exists. */
async function findFileIdByName(parentFolderId: string, name: string): Promise<string | null> {
  const query = [
    `'${parentFolderId}' in parents`,
    `name = '${escapeQueryValue(name)}'`,
    "trashed = false",
  ].join(" and ");

  const params = new URLSearchParams({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
  });

  const data = await driveRequest<{ files: { id: string; name: string }[] }>(
    `${DRIVE_API}/files?${params.toString()}`,
  );
  return data.files[0]?.id ?? null;
}

/**
 * Uploads `buffer` as `filename` into `parentFolderId`. If a file with the same name already
 * exists there (e.g. a re-run for the same week after a correction), its contents are
 * overwritten in place. Permanently deleting a Shared Drive file needs the Manager role, which
 * the service account doesn't have; overwriting needs only edit access, and keeps the file's
 * link and version history.
 */
export async function uploadFileToFolder(
  parentFolderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const existingFileId = await findFileIdByName(parentFolderId, filename);

  const boundary = `jbjtimesheet${Date.now()}`;
  // An update can't set `parents`, so only a new file gets it.
  const metadata = JSON.stringify(
    existingFileId ? { name: filename } : { name: filename, parents: [parentFolderId] },
  );

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const params = new URLSearchParams({ uploadType: "multipart", supportsAllDrives: "true" });
  const url = existingFileId
    ? `${DRIVE_UPLOAD_API}/files/${existingFileId}?${params.toString()}`
    : `${DRIVE_UPLOAD_API}/files?${params.toString()}`;
  const data = await driveRequest<{ id: string }>(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    data: multipartBody,
  });
  return data.id;
}
