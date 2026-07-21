import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  compact?: boolean;
  multiple?: boolean;
  label?: string;
}

export function ImageDropzone({
  onFiles,
  busy = false,
  compact = false,
  multiple = true,
  label = "Drop images or browse",
}: ImageDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center border border-dashed border-border text-center text-sm text-muted-foreground transition-colors hover:border-foreground/60 hover:text-foreground",
        compact ? "min-h-20 gap-1 p-3" : "min-h-32 gap-2 p-5",
        dragActive && "border-foreground bg-muted/50 text-foreground",
        busy && "pointer-events-none opacity-60",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <ImagePlus className="size-5" aria-hidden="true" />
      )}
      <span>{busy ? "Uploading…" : label}</span>
      {!compact && <span className="text-xs">JPG, PNG, WebP or AVIF</span>}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}
