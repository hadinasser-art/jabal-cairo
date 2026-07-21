import { useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from "lucide-react";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { PhotoTile, type SaveState } from "@/components/admin/PhotoTile";
import type { AdminMediaRow, MediaKind, UploadJob } from "@/components/admin/types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface ColorGroupProps {
  color: string | null;
  rows: AdminMediaRow[];
  colorPosition: number;
  colorCount: number;
  uploadJobs: UploadJob[];
  drafts: Record<string, { label: string; kind: MediaKind }>;
  saveStates: Record<string, SaveState>;
  busy: boolean;
  onFiles: (files: File[]) => void;
  onRename: (nextColor: string) => Promise<boolean>;
  onDeleteGroup: () => void;
  onMoveGroup: (direction: -1 | 1) => void;
  onGroupDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onGroupDrop: (event: DragEvent<HTMLDivElement>) => void;
  onLabelChange: (row: AdminMediaRow, label: string) => void;
  onLabelCommit: (row: AdminMediaRow) => void;
  onKindChange: (row: AdminMediaRow, kind: MediaKind) => void;
  onReplace: (row: AdminMediaRow, file: File) => void;
  onDeletePhoto: (row: AdminMediaRow) => void;
  onMovePhoto: (rowId: string, direction: -1 | 1) => void;
  onPhotoDragStart: (event: DragEvent<HTMLButtonElement>, rowId: string) => void;
  onPhotoDrop: (event: DragEvent<HTMLDivElement>, rowId: string) => void;
}

export function ColorGroup({
  color,
  rows,
  colorPosition,
  colorCount,
  uploadJobs,
  drafts,
  saveStates,
  busy,
  onFiles,
  onRename,
  onDeleteGroup,
  onMoveGroup,
  onGroupDragStart,
  onGroupDrop,
  onLabelChange,
  onLabelCommit,
  onKindChange,
  onReplace,
  onDeletePhoto,
  onMovePhoto,
  onPhotoDragStart,
  onPhotoDrop,
}: ColorGroupProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(color || "");

  const submitRename = async () => {
    if (await onRename(name)) setRenaming(false);
  };

  return (
    <Card
      className="rounded-none bg-card/20 shadow-none"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onGroupDrop}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-4">
        <div className="min-w-0">
          {renaming ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitRename();
                  if (event.key === "Escape") setRenaming(false);
                }}
                aria-label="New color name"
                autoFocus
              />
              <Button type="button" size="sm" onClick={() => void submitRename()}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-base font-medium capitalize">
                {color || "No color"}
              </CardTitle>
              <Badge variant="outline">
                {rows.length} {rows.length === 1 ? "photo" : "photos"}
              </Badge>
            </div>
          )}
        </div>
        {color && (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              draggable
              onDragStart={onGroupDragStart}
              className="cursor-grab active:cursor-grabbing"
              aria-label={`Drag ${color} color group to reorder`}
            >
              <GripVertical aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={colorPosition === 0 || busy}
              onClick={() => onMoveGroup(-1)}
              aria-label={`Move ${color} group up`}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={colorPosition === colorCount - 1 || busy}
              onClick={() => onMoveGroup(1)}
              aria-label={`Move ${color} group down`}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRenaming(true)}
              disabled={busy}
              aria-label={`Rename ${color}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label={`Delete ${color} group`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{color}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the color group and {rows.length} photo
                    {rows.length === 1 ? "" : "s"}, including uploaded storage files.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteGroup}>Delete group</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row, index) => {
            const draft = drafts[row.id] || { label: row.label, kind: row.kind };
            return (
              <PhotoTile
                key={row.id}
                row={row}
                label={draft.label}
                kind={draft.kind}
                position={index}
                count={rows.length}
                state={saveStates[row.id] || { status: "idle" }}
                onLabelChange={(label) => onLabelChange(row, label)}
                onLabelCommit={() => onLabelCommit(row)}
                onKindChange={(kind) => onKindChange(row, kind)}
                onReplace={(file) => onReplace(row, file)}
                onDelete={() => onDeletePhoto(row)}
                onMove={(direction) => onMovePhoto(row.id, direction)}
                onDragStart={(event) => onPhotoDragStart(event, row.id)}
                onDrop={(event) => onPhotoDrop(event, row.id)}
              />
            );
          })}
          <ImageDropzone onFiles={onFiles} busy={busy} label="Drop one or several images" />
        </div>

        {uploadJobs.length > 0 && (
          <div className="grid gap-2" aria-live="polite">
            {uploadJobs.map((job) => (
              <div key={job.id} className="border p-3 text-xs">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate">{job.fileName}</span>
                  <Badge
                    variant={job.status === "error" ? "destructive" : "outline"}
                    className="capitalize"
                  >
                    {job.status}
                  </Badge>
                </div>
                <Progress value={job.progress} />
                {job.message && <p className="mt-2 text-muted-foreground">{job.message}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
