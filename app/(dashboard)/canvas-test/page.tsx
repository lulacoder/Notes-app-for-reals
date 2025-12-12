"use client";

import { useEffect, useState } from "react";

export default function CanvasTestPage() {
  const [TldrawModule, setTldrawModule] = useState<typeof import("@tldraw/tldraw") | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tldraw module (CSS is imported globally in app/globals.css)
  useEffect(() => {
    let cancelled = false;
    
    const loadTldraw = async () => {
      try {
        // Load module
        const mod = await import("@tldraw/tldraw");
        if (!cancelled) {
          setTldrawModule(mod);
        }
      } catch (err) {
        console.error("Failed to load tldraw:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    };
    
    loadTldraw();
    
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <p>Error loading tldraw:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!TldrawModule) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p>Loading tldraw...</p>
        </div>
      </div>
    );
  }

  const { Tldraw } = TldrawModule;

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw />
    </div>
  );
}
