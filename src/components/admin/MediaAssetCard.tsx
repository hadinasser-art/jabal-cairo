import { Loader2, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MediaAssetCardProps {
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function MediaAssetCard({
  title,
  description,
  imageUrl,
  imageAlt,
  busy,
  onUpload,
  onRemove,
}: MediaAssetCardProps) {
  return (
    <Card className="rounded-none bg-card/30 shadow-none">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {busy && (
            <Badge variant="outline">
              <Loader2 className="mr-1 size-3 animate-spin" aria-hidden="true" /> Saving
            </Badge>
          )}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-[9rem_1fr]">
        <div className="aspect-square overflow-hidden border bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <ImageDropzone
            onFiles={(files) => files[0] && onUpload(files[0])}
            busy={busy}
            compact
            multiple={false}
            label={imageUrl ? "Drop a replacement or browse" : "Drop an image or browse"}
          />
          {imageUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={busy}>
                  <Trash2 aria-hidden="true" /> Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {title.toLowerCase()}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the image from the product and permanently deletes its uploaded
                    file when it belongs to the products bucket.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>Remove image</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
