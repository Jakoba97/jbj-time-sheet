"use client";

import { useState } from "react";

type ExportStatus =
  | { state: "idle" }
  | { state: "uploading" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export function DriveExportButton({
  timesheetId,
  compact = false,
}: {
  timesheetId: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<ExportStatus>({ state: "idle" });

  async function handleClick() {
    setStatus({ state: "uploading" });
    try {
      const res = await fetch(`/api/timesheets/${timesheetId}/drive`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ state: "error", message: body.error ?? "Upload to Drive failed." });
        return;
      }
      setStatus({
        state: "success",
        message: `Saved ${body.fileCount} files to ${body.folderName}'s Drive folder.`,
      });
    } catch {
      setStatus({ state: "error", message: "Upload to Drive failed. Please try again." });
    }
  }

  const sizeClasses = compact ? "px-4 py-2 text-base" : "h-12 px-6 py-3 text-lg";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status.state === "uploading"}
        className={`${sizeClasses} whitespace-nowrap rounded-md border-2 border-brand-red font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {status.state === "uploading" ? "Exporting..." : "Export to Drive"}
      </button>
      {(status.state === "success" || status.state === "error") && (
        <p role="status" className="max-w-xs text-base text-brand-gray">
          {status.message}
        </p>
      )}
    </div>
  );
}
