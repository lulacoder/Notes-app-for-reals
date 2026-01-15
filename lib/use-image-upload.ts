"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallback } from "react";

interface UseImageUploadOptions {
  noteId?: Id<"notes">;
  canvasId?: Id<"canvases">;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const saveUpload = useMutation(api.uploads.saveUpload);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();

      // Save upload metadata and get the public URL
      const result = await saveUpload({
        storageId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        noteId: options.noteId,
        canvasId: options.canvasId,
      });

      if (!result.url) {
        throw new Error("Failed to get upload URL");
      }

      return result.url;
    },
    [generateUploadUrl, saveUpload, options.noteId, options.canvasId]
  );

  return { uploadImage };
}
