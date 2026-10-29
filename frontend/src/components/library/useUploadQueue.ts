"use client";

// Upload queue: validates files, then uploads them ONE AT A TIME.
// One at a time on purpose — every PDF is embedded with Gemini's free tier,
// which allows ~100 requests a minute; parallel uploads would hit that limit.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, uploadPdf, type UploadHandle } from "@/lib/api";
import type { DocumentItem, UploadResponse } from "@/types";

export type UploadState = "queued" | "uploading" | "processing" | "done" | "error" | "duplicate";

export interface UploadItem {
  id: string;
  file: File;
  state: UploadState;
  progress: number; // 0..1, upload only
  error?: string;
  result?: UploadResponse;
}

let counter = 0;
const nextId = () => `u${Date.now()}-${counter++}`;

export function useUploadQueue({
  maxMb,
  existing,
  onUploaded,
}: {
  maxMb: number;
  existing: DocumentItem[];
  onUploaded: (doc: UploadResponse) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const active = useRef<{ id: string; handle: UploadHandle } | null>(null);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const patch = useCallback((id: string, p: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  /** Check a file before it's queued. Returns an error message or null. */
  const validate = useCallback(
    (file: File): string | null => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) return "Only PDF files can be uploaded.";
      if (file.size === 0) return "This file is empty.";
      if (file.size > maxMb * 1024 * 1024) return `This file is larger than ${maxMb} MB.`;
      return null;
    },
    [maxMb]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      setItems((prev) => {
        const added: UploadItem[] = list.map((file) => {
          const error = validate(file);
          // Same name in the library or already queued → likely a duplicate.
          const dup =
            !error &&
            (existing.some((d) => d.filename === file.name) ||
              prev.some(
                (p) => p.file.name === file.name && p.file.size === file.size && p.state !== "error"
              ));
          return {
            id: nextId(),
            file,
            progress: 0,
            state: error ? "error" : dup ? "duplicate" : "queued",
            error: error ?? undefined,
          };
        });
        return [...prev, ...added];
      });
    },
    [existing, validate]
  );

  // Start the next queued item whenever nothing is uploading.
  useEffect(() => {
    if (active.current) return;
    const next = items.find((it) => it.state === "queued");
    if (!next) return;

    const handle = uploadPdf(
      next.file,
      (fraction) => patch(next.id, { progress: fraction }),
      () => patch(next.id, { state: "processing", progress: 1 })
    );
    active.current = { id: next.id, handle };
    patch(next.id, { state: "uploading", progress: 0 });

    handle.promise
      .then((result) => {
        patch(next.id, { state: "done", result });
        onUploadedRef.current(result);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          setItems((prev) => prev.filter((it) => it.id !== next.id));
        } else {
          patch(next.id, {
            state: "error",
            error: err instanceof ApiError ? err.message : "Upload failed. Please try again.",
          });
        }
      })
      .finally(() => {
        active.current = null;
        // Nudge the effect to pick up the next queued item.
        setItems((prev) => [...prev]);
      });
  }, [items, patch]);

  const cancel = useCallback((id: string) => {
    if (active.current?.id === id) active.current.handle.cancel();
    else setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          const error = validate(it.file);
          return error ? { ...it, error } : { ...it, state: "queued", error: undefined, progress: 0 };
        })
      );
    },
    [validate]
  );

  const uploadAnyway = useCallback(
    (id: string) => patch(id, { state: "queued" }),
    [patch]
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.state !== "done"));
  }, []);

  return { items, addFiles, cancel, retry, uploadAnyway, dismiss, clearFinished };
}
