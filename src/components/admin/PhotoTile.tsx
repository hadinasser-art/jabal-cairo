import type { DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Trash2 } from "lucide-react";
import type { AdminMediaRow, MediaKind } from "@/components/admin/types";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

interface PhotoTileProps {
  row: AdminMediaRow;
  label: string;
  kind: MediaKind;
  position: number;
  count: number;
  state: SaveState;
  onLabelChange: (label: string) => void;
  onLabelCommit: () => void;
  onKindChange: (kind: MediaKind) => void;
  onReplace: (file: File) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function PhotoTile({
  row,
  label,
  kind,
  position,
  count,
  state,
  onLabelChange,
  onLabelCommit,
  onKindChange,
  onReplace,
  onDelete,
  onMove,
  onDragStart,
  onDrop,
}: PhotoTileProps) {
  return (
    <Card
      className="rounded-none bg-background shadow-none"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <CardContent className="space-y-3 p-3">
        <div className="group relative aspect-[4/5] overflow-hidden bg-muted">
          <img src={row.url} alt={label} className="size-full object-cover" loading="lazy" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            draggable
            onDragStart={onDragStart}
            className="absolute left-2 top-2 cursor-grab opacity-90 active:cursor-grabbing"
            aria-label={`Drag ${label} to reorder`}
          >
            <GripVertical aria-hidden="true" />
          </Button>
          <div className="absolute right-2 top-2">
            <SaveIndicator state={state} />
          </div>
        </div>

        <Input
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          onBlur={onLabelCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          aria-label="Photo label"
          placeholder="Photo label"
        />

        <ToggleGroup
          type="single"
          value={kind}
          onValueChange={(value) => value && onKindChange(value as MediaKind)}
          variant="outline"
          size="sm"
          className="grid grid-cols-2"
          aria-label="Photo use"
        >
          <ToggleGroupItem value="gallery" aria-label="Use in gallery">
            Gallery
          </ToggleGroupItem>
          <ToggleGroupItem value="thumbnail" aria-label="Use as color thumbnail">
            Thumbnail
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs leading-5 text-muted-foreground">
          {kind === "thumbnail"
            ? "Shown in color pickers on listings and product pages."
            : "Shown in the product gallery."}
        </p>

        <ImageDropzone
          onFiles={(files) => files[0] && onReplace(files[0])}
          busy={state.status === "saving"}
          compact
          multiple={false}
          label="Replace image"
        />

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={position === 0 || state.status === "saving"}
            onClick={() => onMove(-1)}
            aria-label={`Move ${label} up`}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={position === count - 1 || state.status === "saving"}
            onClick={() => onMove(1)}
            aria-label={`Move ${label} down`}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={state.status === "saving"}
                aria-label={`Delete ${label}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{label}” will be removed from the product and its uploaded file will be
                  permanently deleted from storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete photo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "idle") return null;
  if (state.status === "saving") {
    return (
      <Badge variant="secondary">
        <Loader2 className="mr-1 size-3 animate-spin" aria-hidden="true" /> Saving
      </Badge>
    );
  }
  if (state.status === "error") {
    return (
      <Badge variant="destructive" title={state.message}>
        Error
      </Badge>
    );
  }
  return <Badge variant="secondary">Saved</Badge>;
}
