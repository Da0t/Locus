// OWNER: W3 (subject photo). Header portrait backed by Convex file storage.
// Upload once and it appears in EVERY connected searcher's header (storage +
// reactivity), survives reload — "her photo is in every searcher's pocket."
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "../lib/utils";

export function SubjectPhoto({ caseId }: { caseId: Id<"cases"> }) {
  const photoUrl = useQuery(api.photos.url, { caseId });
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const attach = useMutation(api.photos.attach);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Esc closes the enlarged view.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  // Standard Convex upload: generate URL → POST bytes → attach storageId.
  async function upload(file: File) {
    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await attach({ caseId, storageId });
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = ""; // allow re-picking the same file
  }

  // photoUrl === undefined while loading; null when no photo attached.
  if (photoUrl === undefined) {
    return <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />;
  }

  if (!photoUrl) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Add subject photo"
          title="Add subject photo"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "border border-dashed border-muted-foreground/50 text-muted-foreground",
            "transition-colors hover:border-primary hover:text-primary",
            "disabled:opacity-50",
          )}
        >
          {uploading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <PhotoPlusIcon />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="View subject photo"
        title="Subject — click to enlarge"
        className={cn(
          "h-10 w-10 shrink-0 overflow-hidden rounded-full",
          "border border-border ring-1 ring-primary/30 transition-transform hover:scale-105",
        )}
      >
        <img src={photoUrl} alt="Subject" className="h-full w-full object-cover" />
      </button>
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-8 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Subject photo"
        >
          <img
            src={photoUrl}
            alt="Subject"
            className="max-h-[80vh] max-w-[80vw] rounded-lg border border-border object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

function PhotoPlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="3.2" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="M18.5 4.5v4M20.5 6.5h-4" />
    </svg>
  );
}
